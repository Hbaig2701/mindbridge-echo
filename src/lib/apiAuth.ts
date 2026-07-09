// Helper for route handlers: resolve the logged-in user + a request-scoped
// Supabase client (RLS applies as that user). Returns a 401 response if absent.

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export type AuthedContext = { supabase: SupabaseClient; user: User };

export async function getAuthedContext(): Promise<AuthedContext | NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return { supabase, user };
}

export function isResponse(x: AuthedContext | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}
