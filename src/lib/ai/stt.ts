// SpeechToText interface + OpenAI Whisper implementation.
// Providers are swappable behind this interface. Raw audio is transcribed and
// discarded — never persisted (privacy, per spec §1/§10).

import { toFile } from 'openai/uploads';
import { openai } from './openai';
import { withRetry } from '@/lib/reliability';

export interface SpeechToText {
  transcribe(audio: Blob | Buffer, filename: string): Promise<string>;
}

class WhisperSTT implements SpeechToText {
  async transcribe(audio: Blob | Buffer, filename: string): Promise<string> {
    const file = await toFile(audio, filename);
    const res = await withRetry(
      () =>
        openai().audio.transcriptions.create({
          file,
          model: 'whisper-1',
        }),
      { label: 'whisper.transcribe', timeoutMs: 45_000 },
    );
    return res.text.trim();
  }
}

export function getSTT(): SpeechToText {
  return new WhisperSTT();
}
