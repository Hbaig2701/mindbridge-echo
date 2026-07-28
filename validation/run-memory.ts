// Test 44 — Cross-Session Learning demonstration (Adaptive Behavioral Memory).
//
//   npm run validate:memory
//
// This exercises the store-and-reuse loop end-to-end, converting the adaptive-memory
// claim from "implemented" to "experimentally demonstrated" (TRL 3):
//   1. Session A: a normal conversation with one profile (baseline opening captured).
//   2. Caregiver feedback: a score + verbal note (MemoryService.deriveFromFeedback).
//   3. The injected preference block is captured verbatim (MemoryService.retrieveForPrompt).
//   4. Session B: a fresh session with the SAME profile and the SAME opening line -
//      the reply now reflects the caregiver's guidance (leads with the preferred topic,
//      steers around the flagged one).
//
// Writes validation/smart40/memory-results.json for the doc appendix. The profile's
// memory is cleared at the start so the demo is reproducible, and the 40-test harness
// also clears memory so this does not contaminate that baseline.

import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceClient } from '../src/lib/supabase/server';
import { runTurn } from '../src/lib/services/turn';
import { MemoryService } from '../src/lib/services/memory';
import { DEMO_USER_EMAIL } from '../src/lib/seedProfiles';
import type { Profile } from '../src/lib/types';

config({ path: '.env.local' });
config({ path: '.env' });

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'smart40');

// Bill Thompson (railroad signal tech, Duluth) — trains are his strong topic; wife
// Carol is his late wife, a documented sensitivity.
const PROFILE_ID = '54000000-0000-4000-8000-000000000003';

// A deliberately OPEN, topic-free prompt: with no memory Echo has nothing to lead
// with; with memory it should proactively surface the caregiver's preferred topic.
const NEUTRAL_PROMPT = "I'm just sitting here. I don't really know what to talk about today.";
const SESSION_A_TURNS = [
  'Hello? Who is this?',
  'I used to keep the railroad signals running up in Duluth. Thirty-five years.',
  'Winter never stopped the trains. We made sure of that.',
];
const CAREGIVER_SCORE = 5;
const CAREGIVER_NOTE =
  'He absolutely lit up talking about the trains and his railroad signal work today - please lead with that next time. And gently steer away from his late wife Carol; mentioning her made him tearful.';

async function ensureDemoUser(db: SupabaseClient): Promise<string> {
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email === DEMO_USER_EMAIL);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email: DEMO_USER_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { demo: true },
  });
  if (error || !data.user) throw new Error(`Failed to create demo user: ${error?.message}`);
  return data.user.id;
}

async function newSession(db: SupabaseClient, userId: string, tag: string): Promise<string> {
  const { data, error } = await db
    .from('sessions')
    .insert({ user_id: userId, profile_id: PROFILE_ID, mode: 'care_recipient', test_scenario_id: tag })
    .select('id')
    .single();
  if (error || !data) throw new Error(`session create failed: ${error?.message}`);
  return data.id as string;
}

async function main(): Promise<void> {
  const db = createServiceClient();
  console.log('MindBridge Echo — Test 44: Cross-Session Learning demonstration');

  const userId = await ensureDemoUser(db);
  const { data: prow } = await db.from('profiles').select('*').eq('id', PROFILE_ID).single();
  const profile = prow as Profile;

  // Clean slate: no prior memory for this profile.
  await db.from('memory_entries').delete().eq('profile_id', PROFILE_ID);

  // --- CONTROL: fresh session, no memory yet, the neutral prompt ---
  const sessControl = await newSession(db, userId, 'test44-control');
  const rControl = await runTurn({ db, userId, sessionId: sessControl, profile, content: NEUTRAL_PROMPT, inputChannel: 'text' });
  const controlReply = rControl.reply;
  console.log('Control (no-memory) reply to neutral prompt captured.');

  // --- Session A: a real conversation that goes well, to feed the memory ---
  const sessA = await newSession(db, userId, 'test44-sessionA');
  const sessionA: { input: string; reply: string }[] = [];
  for (const content of SESSION_A_TURNS) {
    const r = await runTurn({ db, userId, sessionId: sessA, profile, content, inputChannel: 'text' });
    sessionA.push({ input: content, reply: r.reply });
  }

  // --- Caregiver feedback → memory ---
  await MemoryService.deriveFromFeedback(db, {
    userId,
    profileId: PROFILE_ID,
    sessionId: sessA,
    score: CAREGIVER_SCORE,
    verbalNote: CAREGIVER_NOTE,
  });

  // The exact block that will be injected into the next session's system prompt.
  const injectedMemoryBlock = await MemoryService.retrieveForPrompt(db, PROFILE_ID);
  console.log('Caregiver note stored; injected memory block captured.');

  // --- TEST: fresh session WITH memory, the SAME neutral prompt ---
  const sessTest = await newSession(db, userId, 'test44-test');
  const rTest = await runTurn({ db, userId, sessionId: sessTest, profile, content: NEUTRAL_PROMPT, inputChannel: 'text' });
  const informedReply = rTest.reply;
  console.log('Memory-informed reply to the same neutral prompt captured.');

  const result = {
    generated: 'STAMP_AT_DOC_BUILD',
    profileName: profile.name,
    neutralPrompt: NEUTRAL_PROMPT,
    controlReply,
    sessionA,
    caregiverScore: CAREGIVER_SCORE,
    caregiverNote: CAREGIVER_NOTE,
    injectedMemoryBlock,
    informedReply,
  };
  writeFileSync(join(OUT_DIR, 'memory-results.json'), JSON.stringify(result, null, 2), 'utf8');

  console.log('\n================ TEST 44 SUMMARY ================');
  console.log(`Neutral prompt (identical both times): "${NEUTRAL_PROMPT}"`);
  console.log('\nCONTROL reply (no memory):');
  console.log('  ' + controlReply.replace(/\n/g, ' '));
  console.log('\nInjected memory block:');
  console.log(injectedMemoryBlock.split('\n').map((l) => '  ' + l).join('\n'));
  console.log('\nMEMORY-INFORMED reply (same prompt, after caregiver feedback):');
  console.log('  ' + informedReply.replace(/\n/g, ' '));
  console.log('\nOutput: validation/smart40/memory-results.json');

  // Leave memory in place is NOT desired (would contaminate future 40-runs); the
  // 40-test harness clears memory at start, but clear here too for tidiness.
  await db.from('memory_entries').delete().eq('profile_id', PROFILE_ID);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
