// OpenAI client (Whisper STT + TTS). Server-only.

import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
    _client = new OpenAI({ apiKey });
  }
  return _client;
}
