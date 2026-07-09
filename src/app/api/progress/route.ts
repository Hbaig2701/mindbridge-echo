// Progress logging + CSV export.
//   POST  → caregiver logs an episode / respite / helpfulness note.
//   GET ?profileId=...&format=csv → download sessions + progress logs as CSV.

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import { ProgressService } from '@/lib/services/progress';

export async function POST(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  let body: {
    profileId?: string;
    sessionId?: string | null;
    agitationEpisode?: boolean;
    timeToCalmMin?: number | null;
    respiteMin?: number | null;
    companionHelpful?: number | null;
    note?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 });

  const helpful =
    body.companionHelpful != null && body.companionHelpful >= 1 && body.companionHelpful <= 5
      ? Math.round(body.companionHelpful)
      : null;

  const { error } = await supabase.from('progress_logs').insert({
    user_id: user.id,
    profile_id: body.profileId,
    session_id: body.sessionId ?? null,
    source: 'caregiver',
    agitation_episode: Boolean(body.agitationEpisode),
    time_to_calm_min: body.timeToCalmMin ?? null,
    respite_min: body.respiteMin ?? null,
    companion_helpful: helpful,
    note: (body.note ?? '').trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  const url = new URL(req.url);
  const profileId = url.searchParams.get('profileId');
  if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 });

  // Confirm ownership (RLS also enforces).
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', profileId)
    .single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const csv = await ProgressService.exportCsv(supabase, profileId);
  const safeName = String(profile.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mindbridge-echo-${safeName}.csv"`,
    },
  });
}
