// Server-side auth/session helpers used by server components and route handlers.

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import type { Consent } from '@/lib/types';

/** Returns the logged-in user or null. Never throws. */
export async function getUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Redirects to /login unless a verified user is present. Returns the user. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

/** Fetch the consent/onboarding row for a user (or null). */
export async function getConsent(userId: string): Promise<Consent | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('consents')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as Consent) ?? null;
}

/**
 * Require a verified, onboarded (consented) user. Sends unconsented users into
 * the onboarding flow. Use to gate the main app.
 */
export async function requireOnboardedUser() {
  const user = await requireUser();
  const consent = await getConsent(user.id);
  if (!consent || !consent.agreed) {
    redirect('/onboarding/welcome');
  }
  return { user, consent };
}
