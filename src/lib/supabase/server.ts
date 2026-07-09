// Server-side Supabase clients.
//  - createServerClient(): request-scoped, reads the user's cookie session. Use in
//    route handlers / server components. RLS applies as the logged-in user.
//  - createServiceClient(): service-role, bypasses RLS. Server-only, never per-request
//    for user actions. Used by seed + validation harness (and delete-account cascade).

import { cookies } from 'next/headers';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies are read-only there.
            // Middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

// Service-role client. Never expose to the browser. Bypasses RLS.
export function createServiceClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
