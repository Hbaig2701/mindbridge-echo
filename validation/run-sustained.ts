// Sustained Respite Session harness (Tests 41-43) — validates the 20-30 minute
// Respite Mode claim that the 40-test matrix (max 5 turns) does not exercise.
//
//   npm run validate:sustained
//
// Each session runs ~20 care-recipient turns through the REAL turn loop in ONE
// accumulating session (context grows turn over turn), measuring what is actually
// observable and honest for an automated back-to-back run:
//   - turn count and per-turn latency, incl. latency CREEP (last-third vs first-third)
//   - context retention: max word-shingle similarity between Echo replies (looping)
//   - HITL flags raised, and where
//   - full verbatim transcript for manual review of profile fidelity, tone (turn 15+),
//     and graceful wind-down
//
// HONESTY: this is automated back-to-back turns, NOT a literal 20-minute wall-clock
// session. Turn count is the session-length metric; a real-world duration estimate is
// labeled as such. Writes validation/smart40/sustained-results.json + per-session logs.

import { config } from 'dotenv';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceClient } from '../src/lib/supabase/server';
import { runTurn } from '../src/lib/services/turn';
import { DEMO_USER_EMAIL } from '../src/lib/seedProfiles';
import { SMART40_PROFILES } from './smart40-profiles';
import type { MessageTurnResponse, Profile } from '../src/lib/types';

config({ path: '.env.local' });
config({ path: '.env' });

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'smart40');
const LOGS_DIR = join(OUT_DIR, 'logs');
const SCENARIOS_PATH = join(HERE, 'smart40-sustained.json');

interface Scenario {
  testId: string;
  scenario: string;
  profileName: string;
  profileId: string;
  arc: string;
  turns: string[];
}

interface TurnRecord {
  index: number;
  input: string;
  latencyMs: number;
  reply: string;
  flags: { type: string; reason: string }[];
}

// Word-shingle (bigram) Jaccard similarity — high between two replies => repetition.
function replySimilarity(a: string, b: string): number {
  const shingles = (s: string): Set<string> => {
    const w = s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/gi, '').split(/\s+/).filter(Boolean);
    const set = new Set<string>();
    for (let i = 0; i < w.length - 1; i++) set.add(`${w[i]} ${w[i + 1]}`);
    return set;
  };
  const sa = shingles(a);
  const sb = shingles(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

const fmtSec = (ms: number) => (ms / 1000).toFixed(2);

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

async function loadProfiles(db: SupabaseClient): Promise<Map<string, Profile>> {
  const ids = SMART40_PROFILES.map((p) => p.id);
  const { data, error } = await db.from('profiles').select('*').in('id', ids);
  if (error || !data) throw new Error(`Failed to load profiles: ${error?.message}`);
  const map = new Map<string, Profile>();
  for (const row of data as Profile[]) map.set(row.id, row);
  return map;
}

interface SessionResult {
  testId: string;
  scenario: string;
  profileName: string;
  arc: string;
  timestamp: string;
  turnCount: number;
  turns: TurnRecord[];
  totalProcessingMs: number;
  avgLatencyMs: number;
  firstThirdAvgMs: number;
  lastThirdAvgMs: number;
  latencyCreepPct: number;
  maxReplySimilarity: number;
  maxSimilarPair: [number, number];
  flagCount: number;
  estMinutesLow: number;
  estMinutesHigh: number;
}

function analyze(s: Scenario, timestamp: string, turns: TurnRecord[]): SessionResult {
  const lat = turns.map((t) => t.latencyMs);
  const third = Math.max(1, Math.floor(turns.length / 3));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const firstThird = avg(lat.slice(0, third));
  const lastThird = avg(lat.slice(-third));

  let maxSim = 0;
  let pair: [number, number] = [0, 0];
  for (let i = 0; i < turns.length; i++) {
    for (let j = i + 1; j < turns.length; j++) {
      const sim = replySimilarity(turns[i].reply, turns[j].reply);
      if (sim > maxSim) {
        maxSim = sim;
        pair = [turns[i].index, turns[j].index];
      }
    }
  }

  const total = lat.reduce((a, b) => a + b, 0);
  // Real-world estimate: a natural spoken exchange (person speaks + listens to reply)
  // runs ~45-75s. Turn count * that range, labeled as an estimate.
  return {
    testId: s.testId,
    scenario: s.scenario,
    profileName: s.profileName,
    arc: s.arc,
    timestamp,
    turnCount: turns.length,
    turns,
    totalProcessingMs: total,
    avgLatencyMs: avg(lat),
    firstThirdAvgMs: firstThird,
    lastThirdAvgMs: lastThird,
    latencyCreepPct: firstThird === 0 ? 0 : ((lastThird - firstThird) / firstThird) * 100,
    maxReplySimilarity: maxSim,
    maxSimilarPair: pair,
    flagCount: turns.reduce((n, t) => n + t.flags.length, 0),
    estMinutesLow: Math.round((turns.length * 45) / 60),
    estMinutesHigh: Math.round((turns.length * 75) / 60),
  };
}

function writeLog(r: SessionResult): void {
  const lines: string[] = [];
  lines.push(`Test ID: ${r.testId}`);
  lines.push(`Scenario: ${r.scenario}`);
  lines.push(`Profile Loaded: ${r.profileName}`);
  lines.push(`Timestamp: ${r.timestamp} UTC`);
  lines.push(`Session shape: ${r.arc}`);
  lines.push(
    `Turns: ${r.turnCount} | Est. real-world duration: ~${r.estMinutesLow}-${r.estMinutesHigh} min (see note) | Total model processing: ${fmtSec(r.totalProcessingMs)}s`,
  );
  lines.push(
    `Latency: avg ${fmtSec(r.avgLatencyMs)}s | first-third ${fmtSec(r.firstThirdAvgMs)}s -> last-third ${fmtSec(r.lastThirdAvgMs)}s (creep ${r.latencyCreepPct >= 0 ? '+' : ''}${r.latencyCreepPct.toFixed(0)}%)`,
  );
  lines.push(
    `Context retention: max reply-to-reply similarity ${(r.maxReplySimilarity * 100).toFixed(0)}% (turns ${r.maxSimilarPair[0]} & ${r.maxSimilarPair[1]}) — low = no looping`,
  );
  lines.push(`HITL flags raised: ${r.flagCount}`);
  lines.push('');
  lines.push('Transcript (verbatim):');
  for (const t of r.turns) {
    lines.push('');
    lines.push(`[Turn ${t.index}] Care recipient: ${t.input}`);
    lines.push(`[Turn ${t.index}] Echo (${fmtSec(t.latencyMs)}s): ${t.reply}`);
    if (t.flags.length) lines.push(`[Turn ${t.index}] FLAG: ${t.flags.map((f) => `${f.type} — ${f.reason}`).join(' | ')}`);
  }
  writeFileSync(join(LOGS_DIR, `test-${r.testId}.md`), lines.join('\n'), 'utf8');
}

async function main(): Promise<void> {
  const scenarios = JSON.parse(readFileSync(SCENARIOS_PATH, 'utf8')) as Scenario[];
  mkdirSync(LOGS_DIR, { recursive: true });
  const db = createServiceClient();

  console.log('MindBridge Echo — Sustained Respite Session harness (Tests 41-43)');
  const userId = await ensureDemoUser(db);
  const profiles = await loadProfiles(db);

  const results: SessionResult[] = [];

  for (const s of scenarios) {
    const profile = profiles.get(s.profileId);
    if (!profile) throw new Error(`${s.testId}: unknown profile ${s.profileId}`);

    const { data: sess, error } = await db
      .from('sessions')
      .insert({ user_id: userId, profile_id: s.profileId, mode: 'care_recipient', test_scenario_id: `sustained-${s.testId}` })
      .select('id')
      .single();
    if (error || !sess) throw new Error(`${s.testId}: session create failed: ${error?.message}`);
    const sessionId = sess.id as string;

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const turns: TurnRecord[] = [];
    console.log(`\n[${s.testId}] ${s.profileName} — ${s.turns.length} turns`);
    for (let i = 0; i < s.turns.length; i++) {
      const content = s.turns[i];
      const t0 = performance.now();
      const result: MessageTurnResponse = await runTurn({ db, userId, sessionId, profile, content, inputChannel: 'text' });
      const latencyMs = performance.now() - t0;
      turns.push({ index: i + 1, input: content, latencyMs, reply: result.reply, flags: result.flags });
      process.stdout.write(`  turn ${i + 1}/${s.turns.length} ${fmtSec(latencyMs)}s${result.flags.length ? ' [FLAG]' : ''}\n`);
    }

    const r = analyze(s, timestamp, turns);
    results.push(r);
    writeLog(r);
    console.log(
      `  => ${r.turnCount} turns | latency avg ${fmtSec(r.avgLatencyMs)}s creep ${r.latencyCreepPct.toFixed(0)}% | max sim ${(r.maxReplySimilarity * 100).toFixed(0)}% | flags ${r.flagCount}`,
    );
  }

  writeFileSync(join(OUT_DIR, 'sustained-results.json'), JSON.stringify({ generated: new Date().toISOString(), results }, null, 2), 'utf8');

  console.log('\n================ SUSTAINED SUMMARY ================');
  for (const r of results) {
    console.log(
      `${r.testId} ${r.profileName.padEnd(16)} turns=${r.turnCount} creep=${r.latencyCreepPct.toFixed(0)}% maxSim=${(r.maxReplySimilarity * 100).toFixed(0)}% flags=${r.flagCount}`,
    );
  }
  console.log('Outputs: validation/smart40/sustained-results.json + logs/test-4X.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
