// Caregiver session feedback → also derives memory_entries (the learning loop).

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import { MemoryService } from '@/lib/services/memory';

export async function POST(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  let body: { sessionId?: string; score?: number; verbalNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const score = Number(body.score);
  if (!body.sessionId || !Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: 'sessionId and score (1–5) are required' }, { status: 400 });
  }

  // Resolve the session's profile so memory attaches to the right person.
  const { data: session } = await supabase
    .from('sessions')
    .select('id, profile_id')
    .eq('id', body.sessionId)
    .single();
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const verbalNote = (body.verbalNote ?? '').trim() || null;

  const { error } = await supabase.from('feedback').insert({
    user_id: user.id,
    session_id: body.sessionId,
    score,
    verbal_note: verbalNote,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Derive memory: worked / didnt_work / caregiver_note.
  await MemoryService.deriveFromFeedback(supabase, {
    userId: user.id,
    profileId: session.profile_id,
    sessionId: body.sessionId,
    score,
    verbalNote,
  });

  return NextResponse.json({ ok: true });
}
