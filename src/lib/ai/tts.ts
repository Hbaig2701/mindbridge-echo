// TextToSpeech interface + OpenAI TTS implementation. Calm voice, slightly slowed.
// The browser SpeechSynthesis fallback lives client-side (see the companion UI) —
// this server path returns audio bytes; if it fails the client falls back.

import { openai } from './openai';
import { withRetry } from '@/lib/reliability';

export interface TextToSpeech {
  speak(text: string): Promise<{ audio: Buffer; contentType: string }>;
}

class OpenAITTS implements TextToSpeech {
  async speak(text: string): Promise<{ audio: Buffer; contentType: string }> {
    const res = await withRetry(
      () =>
        openai().audio.speech.create({
          model: 'tts-1',
          voice: 'shimmer', // calm, gentle voice
          input: text,
          speed: 0.9, // slightly slowed for a dementia-friendly pace
          response_format: 'mp3',
        }),
      { label: 'openai.tts', timeoutMs: 45_000 },
    );

    const arrayBuffer = await res.arrayBuffer();
    return { audio: Buffer.from(arrayBuffer), contentType: 'audio/mpeg' };
  }
}

export function getTTS(): TextToSpeech {
  return new OpenAITTS();
}
