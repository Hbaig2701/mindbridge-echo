'use client';

// Push-to-talk mic button. Tap once to start; it auto-detects when you stop speaking
// (a short silence) and sends automatically — so a turn is one tap, not two. You can
// still tap again to send immediately. Recording is button-STARTED (not always-on):
// nothing is captured until you tap. Uploads to /api/transcribe (Whisper) → onTranscript.
// Any failure surfaces quietly; the caller always has a text fallback.

import { useCallback, useRef, useState } from 'react';

type RecState = 'idle' | 'recording' | 'transcribing' | 'error';

// Voice-activity endpointing parameters.
const SILENCE_MS = 1500; // pause after speech that ends a turn
const MIN_SPEECH_MS = 300; // must hear this much speech before auto-stop can fire
const NO_SPEECH_TIMEOUT_MS = 7000; // if you never speak, stop and reset
const MAX_RECORD_MS = 30000; // hard cap on a single turn
const SPEAKING_RMS = 0.02; // volume threshold that counts as "speaking"

export function MicButton({
  onTranscript,
  size = 'sm',
  idleLabel = 'Speak',
  className,
}: {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'lg';
  idleLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<RecState>('idle');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Web Audio nodes for silence detection.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

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

  // Monitor microphone volume and auto-stop after a trailing silence.
  const startSilenceDetection = useCallback(
    (stream: MediaStream) => {
      let ctx: AudioContext;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
      let hasSpoken = false;
      let lastSpeechAt = startedAt;

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        // RMS of the centered waveform → rough loudness 0..1.
        let sumSq = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / data.length);
        const now = performance.now();

        if (rms > SPEAKING_RMS) {
          hasSpoken = true;
          lastSpeechAt = now;
        }

        const elapsed = now - startedAt;
        const sinceSpeech = now - lastSpeechAt;

        const endedBySilence =
          hasSpoken && elapsed > MIN_SPEECH_MS && sinceSpeech > SILENCE_MS;
        const endedByNoSpeech = !hasSpoken && elapsed > NO_SPEECH_TIMEOUT_MS;
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
          const data = await res.json();
          if (res.ok && data.text) {
            onTranscript(data.text);
            setState('idle');
          } else {
            // Empty transcription (e.g. no speech) → quietly reset, not an error.
            setState(data && 'text' in data ? 'idle' : 'error');
          }
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
  }, [onTranscript, startSilenceDetection]);

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
