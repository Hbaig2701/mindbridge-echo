// Whisper STT. Accepts a multipart audio blob (push-to-talk recording), transcribes,
// and returns text. The raw audio is NEVER persisted — used and discarded (privacy).

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import { getSTT } from '@/lib/ai/stt';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form-data' }, { status: 400 });
  }

  const file = form.get('audio');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
  }

  // Guard against oversized uploads.
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio too large' }, { status: 413 });
  }

  const filename = (file instanceof File && file.name) || 'recording.webm';

  try {
    const text = await getSTT().transcribe(file, filename);
    return NextResponse.json({ text });
  } catch (err) {
    console.error('[api/transcribe] failed:', err);
    // Voice failure → the client silently falls back to typed text.
    return NextResponse.json({ error: 'Transcription failed', text: '' }, { status: 502 });
  }
}
