// Seed script: ensures a demo caregiver user exists and upserts the 3 fictional
// care-recipient profiles (fixed UUIDs) owned by that user. Uses the service role.
//
//   npm run seed
//
// Reads env from .env.local / .env. All profiles are fictional — no real data.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { SEED_PROFILES, DEMO_USER_EMAIL } from '../src/lib/seedProfiles';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const consentVersion = process.env.NEXT_PUBLIC_CONSENT_VERSION || '2026-07-pilot-1';

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureDemoUser(): Promise<string> {
  // Look for an existing demo user.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email === DEMO_USER_EMAIL);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_USER_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { demo: true },
  });
  if (error || !data.user) throw new Error(`Failed to create demo user: ${error?.message}`);
  return data.user.id;
}

async function main() {
  console.log('Seeding MindBridge Echo demo data…');
  const userId = await ensureDemoUser();
  console.log(`Demo user: ${DEMO_USER_EMAIL} (${userId})`);

  // Consent row for the demo user.
  await admin.from('consents').upsert(
    {
      user_id: userId,
      caregiver_type: 'family',
      agreed: true,
      version: consentVersion,
    },
    { onConflict: 'user_id' },
  );

  for (const p of SEED_PROFILES) {
    const { error } = await admin.from('profiles').upsert(
      {
        id: p.id,
        user_id: userId,
        name: p.name,
        age: p.age,
        life_story: p.life_story,
        known_triggers: p.known_triggers,
        known_calming_strategies: p.known_calming_strategies,
        is_fictional: true,
      },
      { onConflict: 'id' },
    );
    if (error) throw new Error(`Failed to upsert profile ${p.name}: ${error.message}`);
    console.log(`  ✓ ${p.name}`);
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
