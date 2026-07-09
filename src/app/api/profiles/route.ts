// Create + update care-recipient profiles.

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import { emptyLifeStory, type LifeStory } from '@/lib/types';

interface ProfileInput {
  id?: string;
  name?: string;
  age?: number | null;
  life_story?: Partial<LifeStory>;
  known_triggers?: string[];
  known_calming_strategies?: string[];
}

function normalize(input: ProfileInput) {
  return {
    name: (input.name ?? '').trim(),
    age: input.age != null && !Number.isNaN(Number(input.age)) ? Number(input.age) : null,
    life_story: { ...emptyLifeStory(), ...(input.life_story ?? {}) },
    known_triggers: Array.isArray(input.known_triggers) ? input.known_triggers.filter(Boolean) : [],
    known_calming_strategies: Array.isArray(input.known_calming_strategies)
      ? input.known_calming_strategies.filter(Boolean)
      : [],
  };
}

export async function POST(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  let input: ProfileInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const row = normalize(input);
  if (!row.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, is_fictional: true, ...row })
    .select('id')
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not create profile' }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

export async function PUT(req: Request) {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase } = ctx;

  let input: ProfileInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!input.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const row = normalize(input);
  if (!row.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const { error } = await supabase.from('profiles').update(row).eq('id', input.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: input.id });
}
