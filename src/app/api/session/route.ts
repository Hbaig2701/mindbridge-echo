// Session lifecycle. POST to start a session; PATCH to end it (optionally reporting
// total active respite seconds accrued client-side).

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import type { SessionMode } from '@/lib/types';

export async function POST(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  let body: { profileId?: string; mode?: SessionMode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const mode: SessionMode = body.mode === 'caregiver' ? 'caregiver' : 'care_recipient';
  if (!body.profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 });
  }

  // Confirm the profile belongs to the caller (RLS also enforces this).
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', body.profileId)
    .single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, profile_id: body.profileId, mode })
    .select('id, started_at')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not start session' }, { status: 500 });
  }
  return NextResponse.json({ sessionId: data.id, startedAt: data.started_at });
}

export async function PATCH(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  let body: { sessionId?: string; respiteSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const update: Record<string, unknown> = { ended_at: new Date().toISOString() };
  // If the client reports a larger total active duration, honor it (keeps the
  // higher of the two — the turn loop also accrues respite).
  if (typeof body.respiteSeconds === 'number' && body.respiteSeconds >= 0) {
    const { data: current } = await supabase
      .from('sessions')
      .select('respite_seconds')
      .eq('id', body.sessionId)
      .single();
    const existing = (current?.respite_seconds as number) ?? 0;
    update.respite_seconds = Math.max(existing, Math.round(body.respiteSeconds));
  }

  const { error } = await supabase.from('sessions').update(update).eq('id', body.sessionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
