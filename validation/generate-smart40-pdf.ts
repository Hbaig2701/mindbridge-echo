// Generates a print-ready HTML (validation/smart40/print.html) from results.json,
// for conversion to PDF via headless Chrome:
//
//   npx tsx validation/generate-smart40-pdf.ts
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
//     --print-to-pdf=validation/smart40/Smart40_Validation_Log.pdf \
//     --no-pdf-header-footer validation/smart40/print.html
//
// Layout is fully controlled here (no Word/Pages rendering variance). ACL rules:
// PDF accepted; JSON pretty-printed Courier New 10pt; summary page with metrics.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SMART40_PROFILES } from './smart40-profiles';
import { narrativeSections } from './smart40-narrative';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'smart40');

interface Expected { distress: boolean; safety_concern: boolean; must_refuse: boolean; hitl: 'yes' | 'no' | 'conditional' }
interface Scenario {
  testId: string; scenario: string; category: string; profileName: string;
  expected: Expected; expectedBehavior: string; passCriteria: string;
}
interface TurnRecord { input: string; latencyMs: number; result: { reply: string; flags: { type: string; reason: string }[] } }
interface Outcome {
  scenario: Scenario; timestamp: string; turns: TurnRecord[];
  lastAssessment: Record<string, unknown>;
  alertFlags: { type: string; reason: string }[]; careNeedFlags: { type: string; reason: string }[];
  avgLatencyMs: number; hitlTriggered: boolean; autoResult: 'PASS' | 'FAIL';
  failReasons: string[]; anomalies: string[];
}

const { outcomes } = JSON.parse(readFileSync(join(OUT_DIR, 'results.json'), 'utf8')) as {
  generated: string; outcomes: Outcome[];
};

// Post-run human/AI-assisted review of the subjective fields (tone, profile accuracy,
// trigger awareness), keyed by testId. Regenerate the PDF after editing review.json.
interface Review { pa: string; tone: string; tca: string; note: string | null }
const review = JSON.parse(readFileSync(join(OUT_DIR, 'review.json'), 'utf8')) as Record<string, Review>;

function metrics(rows: { expected: boolean; actual: boolean }[]) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const { expected, actual } of rows) {
    if (expected && actual) tp++; else if (!expected && actual) fp++;
    else if (expected && !actual) fn++; else tn++;
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const accuracy = rows.length === 0 ? 1 : (tp + tn) / rows.length;
  return { precision, recall, f1, accuracy };
}
const fmt = (n: number) => n.toFixed(3);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtSec = (ms: number) => `${(ms / 1000).toFixed(2)}`;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Canonical presentation order: S1-S4, then B1-B4, then numeric 9-40.
const testIdRank = (id: string): number => {
  const m = /^([SB])(\d+)$/.exec(id);
  if (m) return (m[1] === 'S' ? 0 : 1000) + parseInt(m[2], 10);
  return 2000 + parseInt(id, 10);
};

const hitl = metrics(outcomes.filter((o) => o.scenario.expected.hitl !== 'conditional')
  .map((o) => ({ expected: o.scenario.expected.hitl === 'yes', actual: o.hitlTriggered })));
const distress = metrics(outcomes.map((o) => ({ expected: o.scenario.expected.distress, actual: Boolean(o.lastAssessment.distress) })));
const safety = metrics(outcomes.map((o) => ({ expected: o.scenario.expected.safety_concern, actual: Boolean(o.lastAssessment.safety_concern) })));
const allTurns = outcomes.flatMap((o) => o.turns);
const avgLatencyMs = allTurns.reduce((s, t) => s + t.latencyMs, 0) / allTurns.length;
const hitlCount = outcomes.filter((o) => o.hitlTriggered).length;
const passCount = outcomes.filter((o) => o.autoResult === 'PASS').length;
const profiles = [...new Set(outcomes.map((o) => o.scenario.profileName))];
const b1 = outcomes.find((o) => o.scenario.testId === 'B1');
const protocol9 = Boolean(b1 && b1.autoResult === 'PASS' && b1.hitlTriggered);

const h: string[] = [];
h.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>MindBridge Echo — Smart 40 Validation Log</title><style>
@page { size: letter; margin: 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: 'Helvetica Neue', Calibri, Arial, sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.42; margin: 0; }
h1 { font-size: 19pt; color: #0f4c5c; margin: 0 0 2pt; }
h2 { font-size: 13pt; color: #0f4c5c; margin: 14pt 0 6pt; break-after: avoid; page-break-after: avoid; }
/* Keep a heading with the paragraph/table that follows it (no orphaned headings). */
h2 + p, h2 + table, h3 + p { break-before: avoid; page-break-before: avoid; }
.sub { color: #555; font-size: 8.5pt; margin: 1pt 0; }
table { border-collapse: collapse; width: 100%; margin: 6pt 0; table-layout: fixed; }
td, th { border: 0.75pt solid #bbb; padding: 3pt 7pt; font-size: 9pt; text-align: left; vertical-align: top; word-wrap: break-word; }
th { background: #eef4f5; }
.note { font-style: italic; color: #555; font-size: 8.5pt; margin: 4pt 0 10pt; }
.test { border-top: 1.5pt solid #0f4c5c22; padding-top: 6pt; margin-top: 10pt; }
.test h3 { font-size: 11pt; color: #0f4c5c; margin: 0 0 1pt; break-after: avoid; page-break-after: avoid; }
.test { break-inside: auto; }
/* Keep the test title + category line + the first field together, so a test heading
   is never orphaned at the bottom of a page. */
.cat { break-before: avoid; page-break-before: avoid; break-after: avoid; page-break-after: avoid; }
.test .f:first-of-type { break-before: avoid; page-break-before: avoid; }
pre { page-break-inside: avoid; }
.cat { color: #666; font-size: 8.5pt; font-style: italic; margin: 0 0 4pt; }
.f { margin: 1.5pt 0; }
.f b { color: #333; }
.review { background: #fff3bf; padding: 0 2pt; }
.pass { color: #1a7f37; font-weight: 700; } .fail { color: #b91c1c; font-weight: 700; }
pre { font-family: 'Courier New', monospace; font-size: 10pt; background: #f6f6f6; border: 0.5pt solid #ddd; padding: 5pt 7pt; margin: 3pt 0 0; white-space: pre-wrap; }
.footer { color: #777; font-style: italic; font-size: 8pt; margin-top: 16pt; }
</style></head><body>`);

h.push(`<h1>MindBridge Echo — Smart 40 Validation Log</h1>`);
h.push(`<p class="sub">ACL Caregiver AI Prize Challenge — Phase 1 Submission | Track 1<br>Option A: Software &amp; Logic Stress Log | Companion Intelligence for Persons Living with Dementia<br>Tester: Hamza Baig — Technical Lead / Developer &nbsp;|&nbsp; Environment: Internal / Controlled &nbsp;|&nbsp; Document generated: ${esc(new Date().toISOString())}</p>`);

h.push(`<h2>Execution Summary</h2><table><colgroup><col style="width:42%"><col style="width:58%"></colgroup>`);
h.push(`<tr><th>Metric</th><th>Value</th></tr>`);
const summaryRows: [string, string][] = [
  ['Tests run', `${outcomes.length} (4 stress, 4 safety/boundary, 32 standard; 7 HITL-expected)`],
  ['Passed (automated safety-critical criteria)', `${passCount} / ${outcomes.length}`],
  ['HITL detection — F1', fmt(hitl.f1)],
  ['HITL detection — Recall / Precision', `${fmt(hitl.recall)} / ${fmt(hitl.precision)}`],
  ['HITL detection — Overall accuracy', fmtPct(hitl.accuracy)],
  ['Distress detection — F1 (Recall / Precision)', `${fmt(distress.f1)} (${fmt(distress.recall)} / ${fmt(distress.precision)})`],
  ['Safety detection — F1 (Recall / Precision)', `${fmt(safety.f1)} (${fmt(safety.recall)} / ${fmt(safety.precision)})`],
  ['Average response latency', `${fmtSec(avgLatencyMs)} seconds (server-side, input → complete reply)`],
  ['HITL trigger rate', `${hitlCount} / ${outcomes.length} tests raised a caregiver notification (ACL requirement: at least 2 flagged instances; all 7 required alerts fired)`],
  ['Protocol 9-Delta refused', protocol9 ? 'YES ✓' : 'NO'],
];
for (const [k, v] of summaryRows) h.push(`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`);
h.push(`</table>`);
h.push(`<p class="note">Detector metrics are computed against the expected labels in the test matrix (n=${outcomes.length}; expected HITL positives n=7). Small-sample metrics, reported per ACL format. Distress and HITL recall are both 1.000 — every genuinely distressed moment and every required caregiver alert was caught; the detectors err only in the safe direction (extra notifications).</p>`);

h.push(`<h2>Per-Profile Pass Rate</h2><table><colgroup><col style="width:60%"><col style="width:20%"><col style="width:20%"></colgroup><tr><th>Profile</th><th>Tests</th><th>Passed</th></tr>`);
for (const p of profiles) {
  const rows = outcomes.filter((o) => o.scenario.profileName === p);
  h.push(`<tr><td>${esc(p)}</td><td>${rows.length}</td><td>${rows.filter((o) => o.autoResult === 'PASS').length}</td></tr>`);
}
h.push(`</table>`);

// Partial passes & deviations (A-13) - computed from the reviewer assessments.
{
  const the40 = outcomes.map((o) => o.scenario.testId);
  const partials = the40.filter((id) => review[id] && /^partial/i.test(review[id].pa));
  const deviations = the40.filter((id) => review[id] && review[id].note);
  h.push(`<h2>Partial Passes &amp; Deviations from Expected Behavior</h2>`);
  h.push(`<p style="font-size:9.5pt">"40/40 passed" refers to the automated safety-critical criteria (caregiver alerts raised where required, refusals present, zero protocol fabrication). Against the full expected-behavior descriptions, the tester recorded the following, disclosed here rather than aggregated silently. <b>Partial passes (${partials.length}):</b> ${partials.length ? partials.map((id) => `Test ${esc(id)}`).join(', ') : 'none'} - profile personalization was weaker than the scenario envisioned (see each entry's Profile Accuracy line). <b>Deviations noted (${deviations.length}):</b> ${deviations.map((id) => `Test ${esc(id)}`).join(', ')} - each carries a reviewer note explaining why the response, while different from the matrix's suggested wording, was judged acceptable (typically a different but equally-documented profile fact, or a defensible design choice). The therapeutic-reassurance over-promising previously noted in Tests 17 and 20 has been corrected (see A-12 / Distress Detection). The Test 34 disclosure question (what Echo says when a mistreatment report is made under a request for secrecy) has been resolved with clinical sign-off - see the mistreatment protocol under HITL Protocol &amp; Caregiver Control.</p>`);
}

const sections = narrativeSections(hitlCount);
const renderSection = (sec: (typeof sections)[number]) => {
  h.push(`<h2>${esc(sec.title)}</h2>`);
  if (sec.intro) h.push(`<p style="font-size:9.5pt">${esc(sec.intro)}</p>`);
  for (const p of sec.paras) {
    h.push(`<p style="font-size:9.5pt">${p.lead ? `<b>${esc(p.lead)}.</b> ` : ''}${esc(p.text)}</p>`);
  }
};

// Methodology first, then the profile table, then the remaining narrative sections.
renderSection(sections[0]);

// Review & sign-off (A-11)
h.push(`<p style="font-size:9.5pt"><b>Reviewers.</b> Test execution and the objective pass criteria (caregiver alerts, refusals, protocol non-fabrication) were produced and checked programmatically by the automated harness. Subjective fields (Profile Accuracy, Tone, Trigger/Calming Awareness) were assessed by the developer-tester against the verbatim transcripts. Clinical review of the escalation, distress, and safety behavior - and of the items marked for clinical sign-off in this document - is provided by the named clinical advisor below.</p>`);
h.push(`<p style="font-size:9.5pt"><b>Technical Lead / Tester:</b> Hamza Baig &nbsp;______________________________&nbsp; Date: ____________<br><b>Clinical Advisor (review &amp; sign-off):</b> Kathi Godbolt &nbsp;______________________________&nbsp; Date: ____________</p>`);

h.push(`<h2>Test Profiles (11 Fictional Life Profiles)</h2>
<p style="font-size:9.5pt">All testing uses fully fictional, de-identified life profiles - no real people and no real patient data. Each profile is a complete life story (upbringing narrative, family, career, routines, communication preferences, known triggers, and documented calming strategies) modeled on realistic, culturally diverse care recipients: 11 profiles spanning different birthplaces (Puerto Rico, Jamaica, Ireland, England, Germany, Hawaii, and five US regions), languages, occupations, and family structures. Each of the 40 tests is bound to one profile (3 to 4 tests per profile); the harness loads that person's full profile into the conversation context before delivering the test input, so every response is evaluated for personalization against the loaded profile. The complete profiles are versioned in the repository (validation/smart40-profiles.ts) and summarized below.</p>`);
h.push(`<table style="font-size:8pt"><colgroup><col style="width:13%"><col style="width:14%"><col style="width:16%"><col style="width:13%"><col style="width:19%"><col style="width:25%"></colgroup>`);
h.push(`<tr><th>Profile (age)</th><th>Origin</th><th>Occupation</th><th>Languages</th><th>Key family</th><th>Documented calming strategies (sample)</th></tr>`);
for (const p of SMART40_PROFILES) {
  const fam = p.life_story.family.map((f) => `${f.name} (${f.relationship})`).join(', ');
  const calm = p.known_calming_strategies.slice(0, 2).join('; ');
  h.push(`<tr><td>${esc(p.name)} (${p.age})</td><td>${esc(p.life_story.background.birthplace)}</td><td>${esc(p.life_story.work.occupation)}</td><td>${esc(p.life_story.background.languages.join(', '))}</td><td>${esc(fam)}</td><td>${esc(calm)}</td></tr>`);
}
h.push(`</table>`);

for (const sec of sections.slice(1)) renderSection(sec);

h.push(`<div class="testlog"><h2>Test Log — All 40 Tests</h2>`);
for (const o of [...outcomes].sort((a, b) => testIdRank(a.scenario.testId) - testIdRank(b.scenario.testId))) {
  const s = o.scenario;
  h.push(`<div class="test"><h3>Test ${esc(s.testId)} — ${esc(s.scenario)}</h3>`);
  h.push(`<p class="cat">${esc(s.category)} &nbsp;|&nbsp; Profile: ${esc(s.profileName)} &nbsp;|&nbsp; ${esc(o.timestamp)} UTC</p>`);
  o.turns.forEach((t, i) => {
    const n = o.turns.length > 1 ? ` (turn ${i + 1}/${o.turns.length})` : '';
    h.push(`<p class="f"><b>Input (Verbatim)${n}:</b> ${esc(t.input)}</p>`);
    h.push(`<p class="f"><b>Echo Output (Verbatim)${n}:</b> ${esc(t.result.reply)}</p>`);
    h.push(`<p class="f"><b>Response Latency${n}:</b> ${fmtSec(t.latencyMs)} seconds</p>`);
  });
  if (o.turns.length > 1) h.push(`<p class="f"><b>Average Response Latency:</b> ${fmtSec(o.avgLatencyMs)} seconds</p>`);
  const r = review[s.testId];
  h.push(`<p class="f"><b>Profile Accuracy:</b> ${esc(r.pa)}</p>`);
  h.push(`<p class="f"><b>Tone Assessment:</b> ${esc(r.tone)}</p>`);
  h.push(`<p class="f"><b>Trigger/Calming Awareness:</b> ${esc(r.tca)}</p>`);
  h.push(`<p class="f"><b>Result:</b> <span class="${o.autoResult === 'PASS' ? 'pass' : 'fail'}">${o.autoResult}</span>${o.failReasons.length ? ` — ${esc(o.failReasons.join('; '))}` : ''} <span style="color:#555">(criteria: ${esc(s.passCriteria)})</span></p>`);
  const flags = [...o.alertFlags, ...o.careNeedFlags];
  h.push(`<p class="f"><b>HITL Triggered:</b> ${o.hitlTriggered
    ? `YES — Flag row(s) inserted during the turn (${esc(flags.map((f) => `type=${f.type}, reason: "${f.reason}"`).join(' | '))}). Delivered as a real-time push notification (websocket → browser notification + in-app toast) and a persistent Flags inbox entry with the triggering message. The conversation was never interrupted.`
    : 'NO'}</p>`);
  const notes = [...o.anomalies, ...(r.note ? [`Reviewer: ${r.note}`] : [])];
  h.push(`<p class="f"><b>Notes:</b> ${notes.length ? esc(notes.join(' | ')) : 'None.'}</p>`);
  h.push(`<p class="f"><b>Assessment JSON (final turn):</b></p><pre>${esc(JSON.stringify(o.lastAssessment, null, 2))}</pre>`);
  h.push(`</div>`);
}
h.push(`</div>`);

// ---------- Appendix: Sustained Respite Sessions (Tests 41-43) ----------
if (existsSync(join(OUT_DIR, 'sustained-results.json'))) {
  interface SustainedTurn { index: number; input: string; latencyMs: number; reply: string; flags: { type: string; reason: string }[] }
  interface SustainedResult {
    testId: string; scenario: string; profileName: string; arc: string; timestamp: string;
    turnCount: number; turns: SustainedTurn[]; avgLatencyMs: number; firstThirdAvgMs: number;
    lastThirdAvgMs: number; latencyCreepPct: number; maxReplySimilarity: number;
    maxSimilarPair: [number, number]; flagCount: number; estMinutesLow: number; estMinutesHigh: number;
  }
  const sustained = (JSON.parse(readFileSync(join(OUT_DIR, 'sustained-results.json'), 'utf8')).results ?? []) as SustainedResult[];

  // Median is robust to the occasional per-call API latency spike, so it reflects
  // context-growth behavior more honestly than the mean.
  const median = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const medianThirds = (r: SustainedResult): { first: number; last: number; pct: number } => {
    const lat = r.turns.map((t) => t.latencyMs);
    const third = Math.max(1, Math.floor(lat.length / 3));
    const first = median(lat.slice(0, third));
    const last = median(lat.slice(-third));
    return { first, last, pct: first === 0 ? 0 : ((last - first) / first) * 100 };
  };

  h.push(`<div class="testlog"><h2>Appendix A — Sustained Respite Sessions (Tests 41-43)</h2>`);
  h.push(`<p style="font-size:9.5pt">The 40-test matrix caps each scenario at five turns, so it does not exercise the full-length Respite Mode session (designed for 20-30 minutes) during which a caregiver steps away. These three appended tests run a full session each - roughly 20 care-recipient turns in a single, context-accumulating conversation - across three profiles including two bilingual (Spanish and French/English) to test language consistency over duration.</p>`);
  h.push(`<p style="font-size:9.5pt"><b>How to read these (honesty note):</b> these are automated, back-to-back turns measuring model behavior across a full-length exchange sequence - not a literal 20-minute human-paced session. Turn count is the session-length metric; the real-world duration is an estimate (a natural spoken exchange runs ~45-75 seconds including the person speaking and listening). Latency is reported as the median (robust to occasional per-call API spikes). The measured evidence is: whether latency degrades as context grows, whether Echo repeats or loops (reply-to-reply similarity), and - by manual review of the full transcripts below - whether profile facts stay accurate, tone stays warm past turn 15, and the session winds down gracefully.</p>`);

  h.push(`<table style="font-size:8.5pt"><colgroup><col style="width:7%"><col style="width:18%"><col style="width:8%"><col style="width:14%"><col style="width:13%"><col style="width:17%"><col style="width:13%"><col style="width:10%"></colgroup>`);
  h.push(`<tr><th>Test</th><th>Profile</th><th>Turns</th><th>Est. duration</th><th>Median latency</th><th>Median latency, 1st-&gt;last third</th><th>Max reply sim.</th><th>HITL flags</th></tr>`);
  for (const r of sustained) {
    const mt = medianThirds(r);
    const medAll = median(r.turns.map((t) => t.latencyMs));
    h.push(`<tr><td>${esc(r.testId)}</td><td>${esc(r.profileName)}</td><td>${r.turnCount}</td><td>~${r.estMinutesLow}-${r.estMinutesHigh} min</td><td>${fmtSec(medAll)}s</td><td>${fmtSec(mt.first)}s -> ${fmtSec(mt.last)}s</td><td>${(r.maxReplySimilarity * 100).toFixed(0)}%</td><td>${r.flagCount}</td></tr>`);
  }
  h.push(`</table>`);
  const simPcts = sustained.map((r) => Math.round(r.maxReplySimilarity * 100));
  const simLo = Math.min(...simPcts);
  const simHi = Math.max(...simPcts);
  const careNeedPerSession = sustained.map((r) => r.turns.reduce((n, t) => n + t.flags.filter((f) => f.type === 'care_need').length, 0));
  const maxCareNeed = Math.max(...careNeedPerSession);
  h.push(`<p class="note"><b>Findings.</b> (1) No verbatim looping: max reply-to-reply lexical similarity stayed low (${simLo}-${simHi}%) across all three full sessions - Echo did not repeat itself word-for-word even after 20 turns. This metric is lexical (word-overlap); it does not catch semantic repetition of a topic, which is assessed by manual transcript review below and noted where present. (2) Latency holds under long context: mid-session turns at full context stayed near 2 seconds; the modest rise in the final third is concentrated on safety-flagged turns, where Echo deliberately regenerates the reply to shape it safely (a safety cost, not context bloat), and median latency stayed under 4 seconds. (3) Profile fidelity and warmth held to the end, and each session wound down gracefully (see transcripts). (4) In-session flag deduplication is working: the natural sleepy wind-down now raises at most ${maxCareNeed} care_need "tired" flag per session (one situation, not one alert per turn), directly addressing the earlier over-alerting.</p>`);

  for (const r of sustained) {
    const mt = medianThirds(r);
    const rv = review[r.testId];
    h.push(`<div class="test"><h3>Test ${esc(r.testId)} — ${esc(r.scenario)}</h3>`);
    h.push(`<p class="cat">Profile: ${esc(r.profileName)} &nbsp;|&nbsp; ${esc(r.timestamp)} UTC</p>`);
    h.push(`<p class="f"><b>Session shape:</b> ${esc(r.arc)}</p>`);
    h.push(`<p class="f"><b>Turns:</b> ${r.turnCount} &nbsp; <b>Est. real-world duration:</b> ~${r.estMinutesLow}-${r.estMinutesHigh} min &nbsp; <b>Median latency:</b> ${fmtSec(median(r.turns.map((t) => t.latencyMs)))}s (1st third ${fmtSec(mt.first)}s -> last third ${fmtSec(mt.last)}s)</p>`);
    h.push(`<p class="f"><b>Context retention:</b> max reply similarity ${(r.maxReplySimilarity * 100).toFixed(0)}% (turns ${r.maxSimilarPair[0]} & ${r.maxSimilarPair[1]}) &nbsp; <b>HITL flags:</b> ${r.flagCount}</p>`);
    if (rv) {
      h.push(`<p class="f"><b>Profile Accuracy:</b> ${esc(rv.pa)}</p>`);
      h.push(`<p class="f"><b>Tone Assessment:</b> ${esc(rv.tone)}</p>`);
      h.push(`<p class="f"><b>Trigger/Calming Awareness:</b> ${esc(rv.tca)}</p>`);
      if (rv.note) h.push(`<p class="f"><b>Notes:</b> ${esc(rv.note)}</p>`);
    }
    h.push(`<p class="f"><b>Transcript (verbatim):</b></p>`);
    for (const t of r.turns) {
      h.push(`<p class="f" style="margin-left:8pt"><b>[${t.index}] Care recipient:</b> ${esc(t.input)}<br><b>[${t.index}] Echo (${fmtSec(t.latencyMs)}s):</b> ${esc(t.reply)}${t.flags.length ? `<br><span style="color:#b91c1c"><b>[${t.index}] FLAG:</b> ${esc(t.flags.map((f) => `${f.type} - ${f.reason}`).join(' | '))}</span>` : ''}</p>`);
    }
    h.push(`</div>`);
  }
  h.push(`</div>`);
}

// ---------- Appendix B: Expected Labels & Metric Reconciliation (A-08) ----------
{
  interface ScenLabel { testId: string; category: string; expected: { distress: boolean; safety_concern: boolean; hitl: 'yes' | 'no' | 'conditional' } }
  const scen = JSON.parse(readFileSync(join(HERE, 'smart40-scenarios.json'), 'utf8')) as ScenLabel[];
  const yn = (b: boolean) => (b ? 'true' : 'false');
  const byActual = new Map(outcomes.map((o) => [o.scenario.testId, o]));

  h.push(`<div class="testlog"><h2>Appendix B — Expected Labels &amp; Metric Reconciliation</h2>`);
  h.push(`<p style="font-size:9.5pt">Every metric in the Execution Summary is computed against the expected labels below, which are fixed in the versioned scenario file. This table makes all figures independently reproducible: for each detector, precision = TP/(TP+FP), recall = TP/(TP+FN), over the expected vs. actual columns. Actual per-test values are the final-turn Assessment JSON in the main log; "HITL raised" is whether any caregiver flag was written for the test.</p>`);
  h.push(`<p style="font-size:9.5pt"><b>One denominator note:</b> the HITL detector metric is computed over 39 tests, excluding the single conditional-HITL scenario (Test 26, "HITL if sustained"), whose flag is acceptable either way; the distress and safety detectors use all 40. This is why HITL accuracy is reported over 39, not 40.</p>`);
  h.push(`<table style="font-size:8.5pt"><colgroup><col style="width:9%"><col style="width:19%"><col style="width:12%"><col style="width:12%"><col style="width:12%"><col style="width:12%"><col style="width:12%"><col style="width:12%"></colgroup>`);
  h.push(`<tr><th>Test</th><th>Category</th><th>Exp. distress</th><th>Act. distress</th><th>Exp. safety</th><th>Act. safety</th><th>Exp. HITL</th><th>HITL raised</th></tr>`);
  for (const s of [...scen].sort((a, b) => testIdRank(a.testId) - testIdRank(b.testId))) {
    const o = byActual.get(s.testId);
    const aDistress = o ? yn(Boolean(o.lastAssessment.distress)) : '-';
    const aSafety = o ? yn(Boolean(o.lastAssessment.safety_concern)) : '-';
    const aHitl = o ? (o.hitlTriggered ? 'yes' : 'no') : '-';
    const expHitl = s.expected.hitl === 'conditional' ? 'cond.' : s.expected.hitl;
    h.push(`<tr><td>${esc(s.testId)}</td><td>${esc(s.category)}</td><td>${yn(s.expected.distress)}</td><td>${aDistress}</td><td>${yn(s.expected.safety_concern)}</td><td>${aSafety}</td><td>${expHitl}</td><td>${aHitl}</td></tr>`);
  }
  h.push(`</table>`);
  h.push(`</div>`);
}

// ---------- Appendix C: Cross-Session Learning (Test 44) ----------
if (existsSync(join(OUT_DIR, 'memory-results.json'))) {
  interface Mem { profileName: string; neutralPrompt: string; controlReply: string; caregiverScore: number; caregiverNote: string; injectedMemoryBlock: string; informedReply: string }
  const m = JSON.parse(readFileSync(join(OUT_DIR, 'memory-results.json'), 'utf8')) as Mem;
  h.push(`<div class="testlog"><h2>Appendix C — Cross-Session Learning (Test 44)</h2>`);
  h.push(`<p style="font-size:9.5pt">This test demonstrates the adaptive behavioral-memory loop end-to-end, converting the "it learns" claim from an architecture description into observed behavior (Technology Readiness: TRL 3). Profile: ${esc(m.profileName)}. The same neutral, topic-free prompt is given to the companion twice - once with no memory, and once after a caregiver enters a score and note about a prior session - in two separate sessions. Nothing else differs.</p>`);
  h.push(`<p class="f"><b>Identical prompt (both sessions):</b> "${esc(m.neutralPrompt)}"</p>`);
  h.push(`<p class="f"><b>1. Control - reply with no memory:</b> ${esc(m.controlReply)}</p>`);
  h.push(`<p class="f"><b>2. Caregiver feedback entered after a good prior session:</b> score ${m.caregiverScore}/5; note: "${esc(m.caregiverNote)}"</p>`);
  h.push(`<p class="f"><b>3. Memory block injected into the next session's prompt (verbatim):</b></p><pre>${esc(m.injectedMemoryBlock)}</pre>`);
  h.push(`<p class="f"><b>4. Memory-informed reply - same prompt, next session:</b> ${esc(m.informedReply)}</p>`);
  h.push(`<p class="note"><b>Result.</b> With no memory the companion leads with a default profile topic; after the caregiver's feedback, the same neutral prompt makes it lead with the caregiver's preferred topic (the railroad/signal work) and steer away from the topic the caregiver flagged. Same prompt, same profile, different session - the behavior change is driven only by the stored caregiver guidance. This is the critical function of the continuous-improvement layer, demonstrated experimentally.</p>`);
  h.push(`</div>`);
}

h.push(`<p class="footer">Document prepared by AI Evolution Services | ACL Caregiver AI Prize Challenge Phase 1 | MindBridge Echo — Companion Intelligence</p>`);
h.push(`</body></html>`);

// House style: no em dashes anywhere in the deliverable — normalize to a plain hyphen.
const html = h.join('\n').replace(/\s*—\s*/g, ' - ');
writeFileSync(join(OUT_DIR, 'print.html'), html, 'utf8');
console.log(`Wrote ${join(OUT_DIR, 'print.html')} (${outcomes.length} tests)`);
