// Persistent microphone for hands-free conversation. One mic stream + audio graph
// is opened for the whole session; `listen()` records a single utterance, auto-stops
// on a natural pause, and returns the transcript ('' if no real speech / cancelled).
//
// Robustness mirrors MicButton: silence detection only arms after sustained speech,
// ignores the opening moment, and we never send silence to Whisper.

const SILENCE_MS = 1800; // trailing pause that ends a turn (generous, so slow/paused
// dementia speech isn't cut off mid-thought — Kevin's "latter half doesn't register")
const START_GRACE_MS = 400; // ignore the first moment (turn-taking transient)
const VOICED_RUN_MS = 160; // sustained voiced audio required to count as speech
const NO_SPEECH_TIMEOUT_MS = 10000; // give up a silent listen after this (then loop re-listens)
const MAX_RECORD_MS = 30000; // hard cap on one utterance
const SPEAKING_RMS = 0.03; // loudness threshold that counts as voice

export class VoiceMic {
  private recorder: MediaRecorder | null = null;
  private cancelled = false;

  private constructor(
    private stream: MediaStream,
    private audioCtx: AudioContext,
    private analyser: AnalyserNode,
    private data: Uint8Array<ArrayBuffer>,
  ) {}

  static async create(): Promise<VoiceMic> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AC();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    return new VoiceMic(stream, audioCtx, analyser, new Uint8Array(new ArrayBuffer(analyser.fftSize)));
  }

  /** Interrupt the in-progress listen (e.g. the user typed, or the session ended). */
  cancel() {
    this.cancelled = true;
    try {
      this.recorder?.stop();
    } catch {
      /* already stopped */
    }
  }

  /**
   * Record one utterance. Resolves with the transcript, or '' for silence/cancel.
   * `onSpeechStart` fires ONCE the instant sustained speech is detected — used for
   * barge-in (stop Echo the moment the patient starts talking, before they finish).
   */
  async listen(onSpeechStart?: () => void): Promise<string> {
    this.cancelled = false;
    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch {
        /* ignore */
      }
    }

    const mime = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
    const recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.recorder = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise<string>((resolve) => {
      let resolved = false;
      const done = (val: string) => {
        if (!resolved) {
          resolved = true;
          resolve(val);
        }
      };

      const startedAt = performance.now();
      let lastVoicedAt = 0;
      let voicedRunStart = 0;
      let spoke = false;
      let recording = false; // MediaRecorder is started ONLY once speech begins, so the
      // clip contains just the patient's utterance — not Echo's voice or leading silence.

      recorder.onstop = async () => {
        if (this.cancelled || !spoke) {
          done('');
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          done('');
          return;
        }
        try {
          const form = new FormData();
          const ext = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'mp4' : 'webm';
          form.append('audio', blob, `recording.${ext}`);
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const result = await res.json();
          done(res.ok ? String(result?.text ?? '').trim() : '');
        } catch {
          done('');
        }
      };

      // End the utterance: stop the recorder (→ onstop transcribes) if we ever started
      // it, otherwise resolve empty directly (nothing was recorded).
      const finishListen = () => {
        if (recording) {
          try {
            recorder.stop();
          } catch {
            done('');
          }
        } else {
          done('');
        }
      };

      const tick = () => {
        if (this.cancelled) {
          finishListen();
          return;
        }
        this.analyser.getByteTimeDomainData(this.data);
        let sumSq = 0;
        for (let i = 0; i < this.data.length; i++) {
          const v = (this.data[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / this.data.length);
        const now = performance.now();
        const elapsed = now - startedAt;

        if (elapsed > START_GRACE_MS) {
          if (rms > SPEAKING_RMS) {
            if (voicedRunStart === 0) voicedRunStart = now;
            // Begin capturing at the first voiced frame (start of the utterance).
            if (!recording) {
              try {
                recorder.start();
                recording = true;
              } catch {
                done('');
                return;
              }
            }
            if (now - voicedRunStart >= VOICED_RUN_MS) {
              if (!spoke) onSpeechStart?.(); // fire once, the instant speech is sustained
              spoke = true;
              lastVoicedAt = now;
            }
          } else {
            voicedRunStart = 0;
          }
        }

        const endedBySilence = spoke && lastVoicedAt > 0 && now - lastVoicedAt > SILENCE_MS;
        const endedByNoSpeech = !spoke && elapsed > NO_SPEECH_TIMEOUT_MS;
        const endedByMax = elapsed > MAX_RECORD_MS;

        if (endedBySilence || endedByNoSpeech || endedByMax) {
          finishListen();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  close() {
    this.cancelled = true;
    try {
      this.recorder?.stop();
    } catch {
      /* ignore */
    }
    this.stream.getTracks().forEach((t) => t.stop());
    this.audioCtx.close().catch(() => {});
  }
}
