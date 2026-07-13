// SpeechToText interface + OpenAI implementation. Raw audio is transcribed and
// discarded — never persisted (privacy, per spec §1/§10).
//
// Model defaults to gpt-4o-mini-transcribe — markedly more accurate than whisper-1,
// especially for accents, short mobile clips, and non-English (Spanish). Language is
// auto-detected so bilingual patients are transcribed in whatever they actually speak.
// Override with OPENAI_STT_MODEL (e.g. "whisper-1").

import { toFile } from 'openai/uploads';
import { openai } from './openai';
import { withRetry } from '@/lib/reliability';

export interface SpeechToText {
  transcribe(audio: Blob | Buffer, filename: string): Promise<string>;
}

function sttModel(): string {
  return process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe';
}

// Well-known silence/caption hallucinations to drop (both languages). Kept narrow so
// real short answers ("yes", "gracias", "okay") are never filtered.
const HALLUCINATION_PHRASES = [
  'thanks for watching',
  'thank you for watching',
  'please subscribe',
  'subscribe to my channel',
  'like and subscribe',
  "don't forget to subscribe",
  'see you in the next video',
  'subtítulos realizados por la comunidad de amara.org',
  'subtítulos por',
  'subscríbete al canal',
];

function isHallucination(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[.!?…]+$/g, '');
  if (!clean) return true;
  return HALLUCINATION_PHRASES.some((p) => clean === p || clean.startsWith(p));
}

class OpenAISTT implements SpeechToText {
  async transcribe(audio: Blob | Buffer, filename: string): Promise<string> {
    const file = await toFile(audio, filename);
    const res = await withRetry(
      () =>
        openai().audio.transcriptions.create({
          file,
          model: sttModel(),
          response_format: 'json',
        }),
      { label: 'openai.transcribe', timeoutMs: 45_000 },
    );

    const text = (res.text ?? '').trim();
    return isHallucination(text) ? '' : text;
  }
}

export function getSTT(): SpeechToText {
  return new OpenAISTT();
}
