// Core conversation endpoint. POST one care-recipient utterance, get the companion
// reply + assessment + flags. Runs the shared turn loop as the logged-in user.

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import { runTurn } from '@/lib/services/turn';
import type { Profile } from '@/lib/types';

export async function POST(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  let body: { sessionId?: string; content?: string; inputChannel?: 'voice' | 'text' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const content = (body.content ?? '').trim();
  const sessionId = body.sessionId;
  if (!content || !sessionId) {
    return NextResponse.json({ error: 'sessionId and content are required' }, { status: 400 });
  }

  // Load the session and its profile (RLS ensures the caller owns them).
  const { data: session } = await supabase
    .from('sessions')
    .select('id, profile_id, mode, ended_at')
    .eq('id', sessionId)
    .single();
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.profile_id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  try {
    const result = await runTurn({
      db: supabase,
      userId: user.id,
      sessionId,
      profile: profile as Profile,
      content,
      inputChannel: body.inputChannel ?? 'text',
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/message] turn failed:', err);
    // Never dead-end the care recipient — return a warm, recoverable reply.
    return NextResponse.json(
      {
        reply:
          "I'm having a little trouble hearing you just now. I'm still right here with you. Could you tell me that again?",
        assessment: {
          distress: false,
          distress_type: 'none',
          safety_concern: false,
          safety_type: 'none',
          uncertainty: true,
          confidence: 0,
        },
        flags: [],
        handoff: false,
        degraded: true,
      },
      { status: 200 },
    );
  }
}
