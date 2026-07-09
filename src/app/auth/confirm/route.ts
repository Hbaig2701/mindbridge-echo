// Handles BOTH email-verification and password-recovery callbacks from Supabase.
// Supabase may send either:
//   - token_hash + type  → verify with verifyOtp (magic-link / PKCE-less flow)
//   - code               → exchange with exchangeCodeForSession (PKCE flow)
// On success we redirect to ?next if present, else /onboarding/welcome.
// On failure we redirect to /login?error=link_expired.

import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const token_hash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const code = params.get('code');

  // Only allow same-origin relative redirects to avoid open-redirect abuse.
  const rawNext = params.get('next') ?? '/onboarding/welcome';
  const next = rawNext.startsWith('/') ? rawNext : '/onboarding/welcome';

  const supabase = await createServerClient();

  let ok = false;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) {
    return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL('/login?error=link_expired', url.origin));
}
