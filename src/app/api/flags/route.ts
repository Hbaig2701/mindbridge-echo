// Resolve (or reopen) a caregiver flag.

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';

export async function PATCH(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  let body: { id?: string; resolved?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('flags')
    .update({ resolved: body.resolved ?? true })
    .eq('id', body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
