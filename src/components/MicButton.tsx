'use client';

// Push-to-talk mic button (button-activated, NOT always-on). Tap to start, tap to
// stop → uploads the recording to /api/transcribe (Whisper) → returns text via
// onTranscript. Any failure surfaces quietly; the caller always has a text fallback.

import { useCallback, useRef, useState } from 'react';

type RecState = 'idle' | 'recording' | 'transcribing' | 'error';

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

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

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
            setState('error');
          }
        } catch {
          setState('error');
        }
      };
      recorder.start();
      mediaRef.current = recorder;
      setState('recording');
    } catch {
      // Mic permission denied / unavailable → fall back silently to text entry.
      setState('error');
      stopStream();
    }
  }, [onTranscript]);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
  }, []);

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
        ? 'Tap when done'
        : 'Stop'
      : state === 'transcribing'
        ? 'Listening…'
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
      <path
        d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
        fill="currentColor"
      />
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
