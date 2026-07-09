// TextToSpeech interface + OpenAI TTS implementation. Calm voice, slightly slowed.
// The browser SpeechSynthesis fallback lives client-side (see the companion UI) —
// this server path returns audio bytes; if it fails the client falls back.

import { openai } from './openai';
import { withRetry } from '@/lib/reliability';

export interface TextToSpeech {
  speak(text: string): Promise<{ audio: Buffer; contentType: string }>;
}

// Model + voice are env-overridable so the voice can be tuned without a redeploy of code.
//   OPENAI_TTS_MODEL  default gpt-4o-mini-tts (natural, steerable). tts-1 / tts-1-hd also valid.
//   OPENAI_TTS_VOICE  default sage. Try: shimmer, coral, alloy, sage, nova, fable.
const TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || 'sage';

// Steers gpt-4o-mini-tts toward a gentle, unhurried companion tone.
const TTS_INSTRUCTIONS =
  'Speak in a warm, gentle, and reassuring voice, like a kind companion sitting with an ' +
  'elderly person. Keep the pace slow and unhurried, with soft, natural intonation. ' +
  'Sound caring and patient, never brisk or robotic.';

class OpenAITTS implements TextToSpeech {
  async speak(text: string): Promise<{ audio: Buffer; contentType: string }> {
    const res = await withRetry(
      () =>
        openai().audio.speech.create({
          model: TTS_MODEL,
          voice: TTS_VOICE,
          input: text,
          response_format: 'mp3',
          // instructions only affect the gpt-4o-mini-tts family; harmless otherwise.
          ...(TTS_MODEL.startsWith('gpt-4o') ? { instructions: TTS_INSTRUCTIONS } : { speed: 0.9 }),
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
