// SpeechToText interface + OpenAI Whisper implementation.
// Providers are swappable behind this interface. Raw audio is transcribed and
// discarded — never persisted (privacy, per spec §1/§10).
//
// Whisper hallucinates caption-style phrases ("Thanks for watching!", "Please
// subscribe") when fed near-silence. We request verbose_json so we can read the
// per-segment no_speech_prob and drop those, plus a narrow text blocklist.

import { toFile } from 'openai/uploads';
import { openai } from './openai';
import { withRetry } from '@/lib/reliability';

export interface SpeechToText {
  transcribe(audio: Blob | Buffer, filename: string): Promise<string>;
}

// Narrow list of well-known Whisper silence hallucinations. Kept deliberately
// small so we never filter real short answers ("yes", "thank you", "okay").
const HALLUCINATION_PHRASES = [
  'thanks for watching',
  'thank you for watching',
  'please subscribe',
  'subscribe to my channel',
  'like and subscribe',
  "don't forget to subscribe",
  'see you in the next video',
  'see you next time',
];

interface VerboseSegment {
  no_speech_prob?: number;
  avg_logprob?: number;
}

function isLikelySilenceOrHallucination(text: string, segments: VerboseSegment[]): boolean {
  const clean = text.trim().toLowerCase().replace(/[.!?…]+$/g, '');
  if (!clean) return true;
  if (HALLUCINATION_PHRASES.some((p) => clean === p || clean.startsWith(p))) return true;

  // Acoustic gate: if every segment reads as very likely non-speech, drop it.
  if (segments.length > 0) {
    const allSilent = segments.every(
      (s) => (s.no_speech_prob ?? 0) > 0.6 && (s.avg_logprob ?? 0) < -0.7,
    );
    if (allSilent) return true;
  }
  return false;
}

class WhisperSTT implements SpeechToText {
  async transcribe(audio: Blob | Buffer, filename: string): Promise<string> {
    const file = await toFile(audio, filename);
    const res = await withRetry(
      () =>
        openai().audio.transcriptions.create({
          file,
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json',
          temperature: 0,
        }),
      { label: 'whisper.transcribe', timeoutMs: 45_000 },
    );

    // verbose_json returns { text, segments: [...] }.
    const verbose = res as unknown as { text?: string; segments?: VerboseSegment[] };
    const text = (verbose.text ?? '').trim();
    const segments = verbose.segments ?? [];

    if (isLikelySilenceOrHallucination(text, segments)) return '';
    return text;
  }
}

export function getSTT(): SpeechToText {
  return new WhisperSTT();
}
