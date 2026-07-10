// TTS. POST { text } → mp3 audio bytes (OpenAI TTS, calm slowed voice). On failure
// returns 502 and the client falls back to the browser SpeechSynthesis voice.

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import { getTTS } from '@/lib/ai/tts';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = (body.text ?? '').trim().slice(0, 1200);
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  try {
    const { audio, contentType } = await getTTS().speak(text);
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[api/speak] failed:', err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 502 });
  }
}
