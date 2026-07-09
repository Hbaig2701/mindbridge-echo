'use client';

// Push-to-talk mic button. Tap once to start; it auto-detects when you stop
// speaking (a natural pause) and sends automatically — one tap per turn.
//
// Robustness (added to fight glitches):
//  - onStart fires the moment recording begins → caller stops any TTS (barge-in),
//    so the mic never records Echo's own voice.
//  - Silence detection only arms after SUSTAINED real speech, ignoring the first
//    moments (button click / TTS tail) so it can't cut you off after ~1s.
//  - If no real speech is ever detected, we DON'T send audio to Whisper — this
//    prevents the "Thanks for watching!" silence hallucination.
//
// Uploads to /api/transcribe (Whisper); raw audio is used then discarded.

import { useCallback, useRef, useState } from 'react';

type RecState = 'idle' | 'recording' | 'transcribing' | 'error';

// Voice-activity endpointing.
const SILENCE_MS = 2000; // trailing pause that ends a turn (generous — natural pauses ok)
const START_GRACE_MS = 500; // ignore the very start (click / TTS tail) before listening for speech
const VOICED_RUN_MS = 180; // sustained voiced audio required to count as "speaking"
const NO_SPEECH_TIMEOUT_MS = 6000; // if you never speak, stop and reset (no transcription)
const MAX_RECORD_MS = 30000; // hard cap
const SPEAKING_RMS = 0.03; // loudness threshold that counts as voice

export function MicButton({
  onTranscript,
  onStart,
  size = 'sm',
  idleLabel = 'Speak',
  className,
}: {
  onTranscript: (text: string) => void;
  onStart?: () => void; // fired when recording actually begins (use for barge-in)
  size?: 'sm' | 'lg';
  idleLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<RecState>('idle');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false); // did we detect real, sustained speech this turn?

  const cleanupAudio = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const stop = useCallback(() => {
    cleanupAudio();
    mediaRef.current?.stop();
    mediaRef.current = null;
  }, []);

  const startSilenceDetection = useCallback(
    (stream: MediaStream) => {
      let ctx: AudioContext;
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctx = new AC();
      } catch {
        return; // no Web Audio → manual tap-to-stop still works
      }
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const startedAt = performance.now();
      let lastVoicedAt = 0;
      let voicedRunStart = 0; // when the current run of voiced frames began

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / data.length);
        const now = performance.now();
        const elapsed = now - startedAt;

        // Ignore the opening moments entirely (button click, TTS tail dying out).
        if (elapsed > START_GRACE_MS) {
          if (rms > SPEAKING_RMS) {
            if (voicedRunStart === 0) voicedRunStart = now;
            // Only count as real speech after a sustained voiced run.
            if (now - voicedRunStart >= VOICED_RUN_MS) {
              hasSpokenRef.current = true;
              lastVoicedAt = now;
            }
          } else {
            voicedRunStart = 0; // reset the run on a quiet frame
          }
        }

        const endedBySilence =
          hasSpokenRef.current && lastVoicedAt > 0 && now - lastVoicedAt > SILENCE_MS;
        const endedByNoSpeech = !hasSpokenRef.current && elapsed > NO_SPEECH_TIMEOUT_MS;
        const endedByMax = elapsed > MAX_RECORD_MS;

        if (endedBySilence || endedByNoSpeech || endedByMax) {
          stop();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [stop],
  );

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      hasSpokenRef.current = false;
      onStart?.(); // barge-in: caller stops Echo's voice now

      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        cleanupAudio();
        stopStream();

        // No real speech detected → don't send silence to Whisper. Reset quietly.
        if (!hasSpokenRef.current) {
          setState('idle');
          return;
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          setState('idle');
          return;
        }
        setState('transcribing');
        try {
          const form = new FormData();
          const ext = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm';
          form.append('audio', blob, `recording.${ext}`);
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const result = await res.json();
          const text = (result?.text ?? '').trim();
          if (res.ok && text) {
            onTranscript(text);
          }
          // Empty text (server filtered silence/hallucination) → quietly reset.
          setState('idle');
        } catch {
          setState('error');
        }
      };
      recorder.start();
      mediaRef.current = recorder;
      setState('recording');
      startSilenceDetection(stream);
    } catch {
      // Mic permission denied / unavailable → fall back silently to text entry.
      setState('error');
      cleanupAudio();
      stopStream();
    }
  }, [onTranscript, onStart, startSilenceDetection]);

  const toggle = () => {
    if (state === 'recording') stop();
    else if (state === 'idle' || state === 'error') start();
  };

  const big = size === 'lg';
  const base = big
    ? 'flex flex-col items-center justify-center rounded-full w-40 h-40 text-xl font-semibold shadow-lg'
    : 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border';

  const palette =
    state === 'recording'
      ? big
        ? 'bg-[var(--danger)] text-white animate-pulse'
        : 'bg-[var(--danger)] text-white border-transparent'
      : big
        ? 'bg-[var(--warm-accent)] text-[var(--warm-accent-fg)]'
        : 'bg-white text-[var(--brand)] border-[var(--border)]';

  const label =
    state === 'recording'
      ? big
        ? 'Listening… (tap to send)'
        : 'Listening…'
      : state === 'transcribing'
        ? 'One moment…'
        : state === 'error'
          ? big
            ? 'Try again'
            : 'Retry'
          : idleLabel;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={state === 'transcribing'}
      aria-pressed={state === 'recording'}
      aria-label={state === 'recording' ? 'Stop recording' : 'Start recording'}
      className={`${base} ${palette} ${className ?? ''} disabled:opacity-70`}
    >
      <MicGlyph big={big} />
      <span className={big ? 'mt-2' : ''}>{label}</span>
    </button>
  );
}

function MicGlyph({ big }: { big: boolean }) {
  const s = big ? 40 : 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" fill="currentColor" />
      <path
        d="M19 11a7 7 0 0 1-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
