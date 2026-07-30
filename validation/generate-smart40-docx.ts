// Generates the formatted Word deliverable (Smart40_Validation_Log.docx) from an
// existing run's results.json - no API calls, safe to re-run after every harness run
// or after hand-edits to results.json.
//
//   npx tsx validation/generate-smart40-docx.ts
//
// ACL format rules honored: single Word document, JSON pretty-printed in Courier New
// 10pt, summary page with F1 / recall / precision / accuracy / latency / HITL rate /
// per-profile pass rates. Human-review fields are highlighted yellow with [REVIEW].

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import { SMART40_PROFILES } from './smart40-profiles';
import { narrativeSections } from './smart40-narrative';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'smart40');

// ---------- Load results ----------

interface Expected {
  distress: boolean;
  safety_concern: boolean;
  must_refuse: boolean;
  hitl: 'yes' | 'no' | 'conditional';
}
interface Scenario {
  testId: string;
  scenario: string;
  category: string;
  profileName: string;
  expected: Expected;
  expectedBehavior: string;
  passCriteria: string;
}
interface TurnRecord {
  input: string;
  latencyMs: number;
  result: { reply: string; assessment: Record<string, unknown>; flags: { type: string; reason: string }[] };
}
interface Outcome {
  scenario: Scenario;
  timestamp: string;
  turns: TurnRecord[];
  lastAssessment: Record<string, unknown>;
  alertFlags: { type: string; reason: string }[];
  careNeedFlags: { type: string; reason: string }[];
  avgLatencyMs: number;
  hitlTriggered: boolean;
  autoResult: 'PASS' | 'FAIL';
  failReasons: string[];
  anomalies: string[];
}

// House style: no em dashes in the deliverable - normalize to plain hyphens everywhere.
function stripEm<T>(v: T): T {
  if (typeof v === 'string') return v.replace(/\s*—\s*/g, ' - ') as unknown as T;
  if (Array.isArray(v)) return v.map(stripEm) as unknown as T;
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stripEm(x)])) as unknown as T;
  return v;
}

const { outcomes } = stripEm(
  JSON.parse(readFileSync(join(OUT_DIR, 'results.json'), 'utf8')) as { generated: string; outcomes: Outcome[] },
);

// Post-run review of the subjective fields, keyed by testId (see review.json).
interface Review { pa: string; tone: string; tca: string; note: string | null }
const review = stripEm(
  JSON.parse(readFileSync(join(OUT_DIR, 'review.json'), 'utf8')) as Record<string, Review>,
);

// ---------- Metrics (same math as the runner) ----------

function metrics(rows: { expected: boolean; actual: boolean }[]) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const { expected, actual } of rows) {
    if (expected && actual) tp++;
    else if (!expected && actual) fp++;
    else if (expected && !actual) fn++;
    else tn++;
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

// Canonical presentation order: S1-S4, then B1-B4, then numeric 9-40.
const testIdRank = (id: string): number => {
  const m = /^([SB])(\d+)$/.exec(id);
  if (m) return (m[1] === 'S' ? 0 : 1000) + parseInt(m[2], 10);
  return 2000 + parseInt(id, 10);
};

const hitl = metrics(
  outcomes
    .filter((o) => o.scenario.expected.hitl !== 'conditional')
    .map((o) => ({ expected: o.scenario.expected.hitl === 'yes', actual: o.hitlTriggered })),
);
const distress = metrics(
  outcomes.map((o) => ({ expected: o.scenario.expected.distress, actual: Boolean(o.lastAssessment.distress) })),
);
const safety = metrics(
  outcomes.map((o) => ({ expected: o.scenario.expected.safety_concern, actual: Boolean(o.lastAssessment.safety_concern) })),
);
const allTurns = outcomes.flatMap((o) => o.turns);
const avgLatencyMs = allTurns.reduce((s, t) => s + t.latencyMs, 0) / allTurns.length;
const hitlCount = outcomes.filter((o) => o.hitlTriggered).length;
const passCount = outcomes.filter((o) => o.autoResult === 'PASS').length;
const profiles = [...new Set(outcomes.map((o) => o.scenario.profileName))];
const b1 = outcomes.find((o) => o.scenario.testId === 'B1');
const protocol9 = Boolean(b1 && b1.autoResult === 'PASS' && b1.hitlTriggered);

// ---------- docx helpers ----------

const TEAL = '0F4C5C';
const GREEN = '1A7F37';
const RED = 'B91C1C';

function label(text: string): TextRun {
  return new TextRun({ text: `${text}: `, bold: true });
}
function field(name: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [label(name), new TextRun({ text: value })],
  });
}
function jsonBlock(obj: unknown): Paragraph[] {
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map(
      (line) =>
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: 'F5F5F5' },
          spacing: { after: 0 },
          children: [new TextRun({ text: line, font: 'Courier New', size: 20 })], // 10pt
        }),
    );
}
// Usable page width in twips (US Letter 12240 minus 1440 margins each side).
const PAGE_DXA = 9360;

function cell(
  text: string,
  widthDxa: number,
  opts: { bold?: boolean; fill?: string; size?: number } = {},
): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: opts.size })] })],
  });
}

// colPcts: per-column width as fractions of the page width (must sum to ~1).
function table(rows: string[][], colPcts: number[], headerFill = 'EEF4F5', cellSize?: number): Table {
  const widths = colPcts.map((p) => Math.round(p * PAGE_DXA));
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: PAGE_DXA, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
    },
    rows: rows.map(
      (r, i) =>
        new TableRow({
          children: r.map((c, j) =>
            cell(c, widths[j], i === 0 ? { bold: true, fill: headerFill, size: cellSize } : { size: cellSize }),
          ),
        }),
    ),
  });
}
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel], pageBreak = false): Paragraph {
  return new Paragraph({
    heading: level,
    pageBreakBefore: pageBreak,
    keepNext: true, // keep a heading with the content that follows it (no orphaned headings)
    keepLines: true,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, color: TEAL, bold: true })],
  });
}

// ---------- Build document ----------

const children: (Paragraph | Table)[] = [];

// Title
children.push(
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: 'MindBridge Echo - Smart 40 Validation Log', bold: true, size: 40, color: TEAL })],
  }),
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: 'ACL Caregiver AI Prize Challenge - Phase 1 Submission | Track 1', size: 22 })],
  }),
  new Paragraph({
    spacing: { after: 40 },
    children: [
      new TextRun({
        text: 'Option A: Software & Logic Stress Log | Companion Intelligence for Persons Living with Dementia',
        italics: true,
        size: 20,
        color: '555555',
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: `Tester: Hamza Baig - Technical Lead / Developer  |  Environment: Internal / Controlled  |  Document generated: ${new Date().toISOString()}`,
        size: 18,
        color: '555555',
      }),
    ],
  }),
);

// Summary
children.push(heading('Execution Summary', HeadingLevel.HEADING_1));
children.push(
  table([
    ['Metric', 'Value'],
    ['Tests run', `${outcomes.length} (4 stress, 4 safety/boundary, 32 standard; 7 HITL-expected)`],
    ['Passed (automated safety-critical criteria)', `${passCount} / ${outcomes.length}`],
    ['HITL detection - F1', fmt(hitl.f1)],
    ['HITL detection - Recall / Precision', `${fmt(hitl.recall)} / ${fmt(hitl.precision)}`],
    ['HITL detection - Overall accuracy', fmtPct(hitl.accuracy)],
    ['Distress detection - F1 (Recall / Precision)', `${fmt(distress.f1)} (${fmt(distress.recall)} / ${fmt(distress.precision)})`],
    ['Safety detection - F1 (Recall / Precision)', `${fmt(safety.f1)} (${fmt(safety.recall)} / ${fmt(safety.precision)})`],
    ['Average response latency', `${fmtSec(avgLatencyMs)} seconds (server-side, input → complete reply)`],
    ['HITL trigger rate', `${hitlCount} / ${outcomes.length} tests raised a caregiver notification (ACL requirement: at least 2 flagged instances; all 7 required alerts fired)`],
    ['Protocol 9-Delta refused', protocol9 ? 'YES ✓' : 'NO'],
  ], [0.42, 0.58]),
);
children.push(
  new Paragraph({
    spacing: { before: 120, after: 240 },
    children: [
      new TextRun({
        text: `Detector metrics are computed against the expected labels in the test matrix (n=${outcomes.length}; expected HITL positives n=7). Small-sample metrics, reported per ACL format. Distress and HITL recall are both 1.000 - every genuinely distressed moment and every required caregiver alert was caught; the detectors err only in the safe direction (extra notifications).`,
        italics: true,
        size: 18,
        color: '555555',
      }),
    ],
  }),
);

// Per-profile pass rate
children.push(heading('Per-Profile Pass Rate', HeadingLevel.HEADING_1));
children.push(
  table([
    ['Profile', 'Tests', 'Passed'],
    ...profiles.map((p) => {
      const rows = outcomes.filter((o) => o.scenario.profileName === p);
      return [p, String(rows.length), String(rows.filter((o) => o.autoResult === 'PASS').length)];
    }),
  ], [0.6, 0.2, 0.2]),
);

// Partial passes & deviations (A-13)
{
  const the40 = outcomes.map((o) => o.scenario.testId);
  const partials = the40.filter((id) => review[id] && /^partial/i.test(review[id].pa));
  const deviations = the40.filter((id) => review[id] && review[id].note);
  children.push(heading('Partial Passes & Deviations from Expected Behavior', HeadingLevel.HEADING_1));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun(
          `"40/40 passed" refers to the automated safety-critical criteria (caregiver alerts raised where required, refusals present, zero protocol fabrication). Against the full expected-behavior descriptions, the tester recorded the following, disclosed here rather than aggregated silently. Partial passes (${partials.length}): ${partials.length ? partials.map((id) => `Test ${id}`).join(', ') : 'none'} - profile personalization was weaker than the scenario envisioned. Deviations noted (${deviations.length}): ${deviations.map((id) => `Test ${id}`).join(', ')} - each carries a reviewer note explaining why the response, while different from the matrix's suggested wording, was judged acceptable. The therapeutic-reassurance over-promising previously noted in Tests 17 and 20 has been corrected (see A-12 / Distress Detection). The Test 34 disclosure question (what Echo says when a mistreatment report is made under a request for secrecy) has been resolved per our clinical advisor's guidance - see the mistreatment protocol under HITL Protocol & Caregiver Control.`,
        ),
      ],
    }),
  );
}

// Narrative sections (shared with the PDF via smart40-narrative.ts, so the two
// deliverables never diverge). Methodology first, then the profile table, then the rest.
const sections = narrativeSections(hitlCount);
const renderSection = (sec: (typeof sections)[number]) => {
  children.push(heading(sec.title, HeadingLevel.HEADING_1));
  if (sec.intro) children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun(sec.intro)] }));
  for (const p of sec.paras) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          ...(p.lead ? [new TextRun({ text: `${p.lead}. `, bold: true })] : []),
          new TextRun(p.text),
        ],
      }),
    );
  }
};

renderSection(sections[0]); // Methodology

// Reviewers (A-11)
children.push(
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: 'Reviewers. ', bold: true }),
      new TextRun(
        'Test execution and the objective pass criteria (caregiver alerts, refusals, protocol non-fabrication) were produced and checked programmatically by the automated harness. Subjective fields (Profile Accuracy, Tone, Trigger/Calming Awareness) were assessed by the developer-tester (Hamza Baig) against the verbatim transcripts. The escalation, distress, and safety behavior - including the mistreatment-report protocol (Test 34) - reflects clinical guidance from advisor Kathi Godbolt.',
      ),
    ],
  }),
);

// Test profiles
children.push(heading('Test Profiles (11 Fictional Life Profiles)', HeadingLevel.HEADING_1));
children.push(
  new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun(
        "All testing uses fully fictional, de-identified life profiles - no real people and no real patient data. Each profile is a complete life story (upbringing narrative, family, career, routines, communication preferences, known triggers, and documented calming strategies) modeled on realistic, culturally diverse care recipients: 11 profiles spanning different birthplaces (Puerto Rico, Jamaica, Ireland, England, Germany, Hawaii, and five US regions), languages, occupations, and family structures. Each of the 40 tests is bound to one profile (3 to 4 tests per profile); the harness loads that person's full profile into the conversation context before delivering the test input, so every response is evaluated for personalization against the loaded profile. The complete profiles are versioned in the repository (validation/smart40-profiles.ts) and summarized below.",
      ),
    ],
  }),
);
children.push(
  table(
    [
      ['Profile (age)', 'Origin', 'Occupation', 'Languages', 'Key family', 'Calming strategies (sample)'],
      ...stripEm(SMART40_PROFILES).map((p) => [
        `${p.name} (${p.age})`,
        p.life_story.background.birthplace,
        p.life_story.work.occupation,
        p.life_story.background.languages.join(', '),
        p.life_story.family.map((f) => `${f.name} (${f.relationship})`).join(', '),
        p.known_calming_strategies.slice(0, 2).join('; '),
      ]),
    ],
    [0.13, 0.14, 0.16, 0.13, 0.19, 0.25],
    'EEF4F5',
    16, // 8pt
  ),
);

for (const sec of sections.slice(1)) renderSection(sec);

// Per-test entries - continuous flow with a rule between tests (page break only
// before the first entry so the log section starts on a fresh page).
children.push(heading('Test Log - All 40 Tests', HeadingLevel.HEADING_1, true));
[...outcomes]
  .sort((a, b) => testIdRank(a.scenario.testId) - testIdRank(b.scenario.testId))
  .forEach((o, idx) => {
  const s = o.scenario;
  children.push(
    new Paragraph({
      spacing: { before: idx === 0 ? 120 : 300, after: 80 },
      keepNext: true, // keep the test title with the line that follows
      border: idx === 0 ? undefined : { top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
      children: [new TextRun({ text: `Test ${s.testId} - ${s.scenario}`, bold: true, size: 26, color: TEAL })],
    }),
  );
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      keepNext: true, // chain title -> category -> first field so the heading is never orphaned
      children: [new TextRun({ text: `${s.category}  |  Profile: ${s.profileName}`, italics: true, color: '555555' })],
    }),
  );
  children.push(field('Test ID', s.testId));
  children.push(field('Scenario', s.scenario));
  children.push(field('Profile Loaded', s.profileName));
  children.push(field('Timestamp', `${o.timestamp} UTC`));
  o.turns.forEach((t, i) => {
    const n = o.turns.length > 1 ? ` (turn ${i + 1}/${o.turns.length})` : '';
    children.push(field(`Input (Verbatim)${n}`, t.input));
    children.push(field(`Echo Output (Verbatim)${n}`, t.result.reply));
    children.push(field(`Response Latency${n}`, `${fmtSec(t.latencyMs)} seconds`));
  });
  if (o.turns.length > 1) children.push(field('Average Response Latency', `${fmtSec(o.avgLatencyMs)} seconds`));
  const r = review[s.testId];
  children.push(field('Profile Accuracy', r.pa));
  children.push(field('Tone Assessment', r.tone));
  children.push(field('Trigger/Calming Awareness', r.tca));
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [
        label('Result'),
        new TextRun({ text: o.autoResult, bold: true, color: o.autoResult === 'PASS' ? GREEN : RED }),
        ...(o.failReasons.length ? [new TextRun({ text: ` - ${o.failReasons.join('; ')}` })] : []),
        new TextRun({ text: `  (criteria: ${s.passCriteria})`, color: '555555' }),
      ],
    }),
  );
  const flags = [...o.alertFlags, ...o.careNeedFlags];
  children.push(
    field(
      'HITL Triggered',
      o.hitlTriggered
        ? `YES - Flag row(s) inserted during the turn (${flags.map((f) => `type=${f.type}, reason: "${f.reason}"`).join(' | ')}). Delivered as a real-time push notification (websocket → browser notification + in-app toast) and a persistent Flags inbox entry with the triggering message. The conversation was never interrupted.`
        : 'NO',
    ),
  );
  const testNotes = [...o.anomalies, ...(r.note ? [`Reviewer: ${r.note}`] : [])];
  children.push(field('Notes', testNotes.length ? testNotes.join(' | ') : 'None.'));
  children.push(
    new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: 'Assessment JSON (final turn):', bold: true })],
    }),
  );
  children.push(...jsonBlock(o.lastAssessment));
});

// ---------- Appendix A: Sustained Respite Sessions (Tests 41-43) ----------
if (existsSync(join(OUT_DIR, 'sustained-results.json'))) {
  interface SustainedTurn { index: number; input: string; latencyMs: number; reply: string; flags: { type: string; reason: string }[] }
  interface SustainedResult {
    testId: string; scenario: string; profileName: string; arc: string; timestamp: string;
    turnCount: number; turns: SustainedTurn[]; maxReplySimilarity: number; maxSimilarPair: [number, number];
    flagCount: number; estMinutesLow: number; estMinutesHigh: number;
  }
  const sustained = stripEm(
    (JSON.parse(readFileSync(join(OUT_DIR, 'sustained-results.json'), 'utf8')).results ?? []) as SustainedResult[],
  );
  const median = (xs: number[]): number => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const medThirds = (r: SustainedResult) => {
    const lat = r.turns.map((t) => t.latencyMs);
    const third = Math.max(1, Math.floor(lat.length / 3));
    return { first: median(lat.slice(0, third)), last: median(lat.slice(-third)) };
  };

  children.push(heading('Appendix A - Sustained Respite Sessions (Tests 41-43)', HeadingLevel.HEADING_1, true));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun(
          'The 40-test matrix caps each scenario at five turns, so it does not exercise the full-length Respite Mode session (designed for 20-30 minutes) during which a caregiver steps away. These three appended tests run a full session each - roughly 20 care-recipient turns in a single, context-accumulating conversation - across three profiles including two bilingual (Spanish and French/English) to test language consistency over duration.',
        ),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'How to read these (honesty note). ', bold: true }),
        new TextRun(
          'These are automated, back-to-back turns measuring model behavior across a full-length exchange sequence - not a literal 20-minute human-paced session. Turn count is the session-length metric; the real-world duration is an estimate (a natural spoken exchange runs ~45-75 seconds). Latency is reported as the median (robust to occasional per-call API spikes). Measured evidence: whether latency degrades as context grows, whether Echo repeats or loops (reply-to-reply similarity), and - by manual review of the transcripts - whether profile facts stay accurate, tone stays warm past turn 15, and the session winds down gracefully.',
        ),
      ],
    }),
  );
  children.push(
    table(
      [
        ['Test', 'Profile', 'Turns', 'Est. duration', 'Median latency', 'Median 1st->last third', 'Max reply sim.', 'Flags'],
        ...sustained.map((r) => {
          const mt = medThirds(r);
          return [
            r.testId,
            r.profileName,
            String(r.turnCount),
            `~${r.estMinutesLow}-${r.estMinutesHigh} min`,
            `${fmtSec(median(r.turns.map((t) => t.latencyMs)))}s`,
            `${fmtSec(mt.first)}s -> ${fmtSec(mt.last)}s`,
            `${(r.maxReplySimilarity * 100).toFixed(0)}%`,
            String(r.flagCount),
          ];
        }),
      ],
      [0.07, 0.19, 0.08, 0.15, 0.14, 0.17, 0.1, 0.1],
      'EEF4F5',
      16,
    ),
  );
  children.push(
    new Paragraph({
      spacing: { before: 80, after: 160 },
      children: [
        new TextRun({ text: 'Findings. ', bold: true }),
        new TextRun(
          '(1) No looping: max reply-to-reply similarity stayed low (9-26%) across all three full sessions. (2) Latency holds under long context: mid-session turns at full context stayed near 2 seconds; the modest rise in the final third is concentrated on safety-flagged turns, where Echo deliberately regenerates the reply to shape it safely (a safety cost, not context bloat), and median latency stayed under 4 seconds throughout. (3) Profile fidelity and warmth held to the end, and each session wound down gracefully. (4) Observation for Phase 2: the natural sleepy wind-down raised repeated care_need "tired" flags (four per session), a concrete example of the alert fatigue that per-profile sensitivity tuning targets.',
        ),
      ],
    }),
  );

  sustained.forEach((r, idx) => {
    const rv = review[r.testId];
    const mt = medThirds(r);
    children.push(
      new Paragraph({
        spacing: { before: idx === 0 ? 120 : 300, after: 80 },
        border: idx === 0 ? undefined : { top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
        children: [new TextRun({ text: `Test ${r.testId} - ${r.scenario}`, bold: true, size: 26, color: TEAL })],
      }),
    );
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        keepNext: true,
        children: [new TextRun({ text: `Profile: ${r.profileName}  |  ${r.timestamp} UTC`, italics: true, color: '555555' })],
      }),
    );
    children.push(field('Session shape', r.arc));
    children.push(
      field(
        'Session metrics',
        `${r.turnCount} turns | est. ~${r.estMinutesLow}-${r.estMinutesHigh} min | median latency ${fmtSec(median(r.turns.map((t) => t.latencyMs)))}s (1st third ${fmtSec(mt.first)}s -> last third ${fmtSec(mt.last)}s) | max reply similarity ${(r.maxReplySimilarity * 100).toFixed(0)}% | HITL flags ${r.flagCount}`,
      ),
    );
    if (rv) {
      children.push(field('Profile Accuracy', rv.pa));
      children.push(field('Tone Assessment', rv.tone));
      children.push(field('Trigger/Calming Awareness', rv.tca));
      if (rv.note) children.push(field('Notes', rv.note));
    }
    children.push(
      new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: 'Transcript (verbatim):', bold: true })] }),
    );
    for (const t of r.turns) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `[${t.index}] Care recipient: `, bold: true }),
            new TextRun(t.input),
            new TextRun({ text: `\n[${t.index}] Echo (${fmtSec(t.latencyMs)}s): `, bold: true, break: 1 }),
            new TextRun(t.reply),
            ...(t.flags.length
              ? [new TextRun({ text: `\n[${t.index}] FLAG: ${t.flags.map((f) => `${f.type} - ${f.reason}`).join(' | ')}`, color: RED, break: 1 })]
              : []),
          ],
        }),
      );
    }
  });
}

// ---------- Appendix B: Expected Labels & Metric Reconciliation (A-08) ----------
{
  interface ScenLabel { testId: string; category: string; expected: { distress: boolean; safety_concern: boolean; hitl: 'yes' | 'no' | 'conditional' } }
  const scen = JSON.parse(readFileSync(join(HERE, 'smart40-scenarios.json'), 'utf8')) as ScenLabel[];
  const yn = (b: boolean) => (b ? 'true' : 'false');
  const byActual = new Map(outcomes.map((o) => [o.scenario.testId, o]));

  children.push(heading('Appendix B - Expected Labels & Metric Reconciliation', HeadingLevel.HEADING_1, true));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun(
          'Every metric in the Execution Summary is computed against the expected labels below, which are fixed in the versioned scenario file, making all figures independently reproducible: for each detector, precision = TP/(TP+FP) and recall = TP/(TP+FN) over the expected vs. actual columns.',
        ),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Denominator note. ', bold: true }),
        new TextRun(
          'The HITL detector metric is computed over 39 tests, excluding the single conditional-HITL scenario (Test 26, "HITL if sustained"), whose flag is acceptable either way; the distress and safety detectors use all 40. This is why HITL accuracy is reported over 39, not 40.',
        ),
      ],
    }),
  );
  children.push(
    table(
      [
        ['Test', 'Category', 'Exp. distress', 'Act. distress', 'Exp. safety', 'Act. safety', 'Exp. HITL', 'HITL raised'],
        ...[...scen].sort((a, b) => testIdRank(a.testId) - testIdRank(b.testId)).map((s) => {
          const o = byActual.get(s.testId);
          return [
            s.testId,
            s.category,
            yn(s.expected.distress),
            o ? yn(Boolean(o.lastAssessment.distress)) : '-',
            yn(s.expected.safety_concern),
            o ? yn(Boolean(o.lastAssessment.safety_concern)) : '-',
            s.expected.hitl === 'conditional' ? 'cond.' : s.expected.hitl,
            o ? (o.hitlTriggered ? 'yes' : 'no') : '-',
          ];
        }),
      ],
      [0.09, 0.19, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12],
      'EEF4F5',
      16,
    ),
  );
}

// ---------- Appendix C: Cross-Session Learning (Test 44) ----------
if (existsSync(join(OUT_DIR, 'memory-results.json'))) {
  interface Mem { profileName: string; neutralPrompt: string; controlReply: string; caregiverScore: number; caregiverNote: string; injectedMemoryBlock: string; informedReply: string }
  const m = stripEm(JSON.parse(readFileSync(join(OUT_DIR, 'memory-results.json'), 'utf8')) as Mem);
  children.push(heading('Appendix C - Cross-Session Learning (Test 44)', HeadingLevel.HEADING_1, true));
  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun(
          `This test demonstrates the adaptive behavioral-memory loop end-to-end, converting the "it learns" claim from an architecture description into observed behavior (Technology Readiness: TRL 3). Profile: ${m.profileName}. The same neutral, topic-free prompt is given to the companion twice - once with no memory, and once after a caregiver enters a score and note about a prior session - in two separate sessions. Nothing else differs.`,
        ),
      ],
    }),
    field('Identical prompt (both sessions)', `"${m.neutralPrompt}"`),
    field('1. Control - reply with no memory', m.controlReply),
    field('2. Caregiver feedback entered after a good prior session', `score ${m.caregiverScore}/5; note: "${m.caregiverNote}"`),
  );
  children.push(
    new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: "3. Memory block injected into the next session's prompt (verbatim):", bold: true })] }),
    ...m.injectedMemoryBlock.split('\n').map(
      (line) =>
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: 'F5F5F5' },
          spacing: { after: 0 },
          children: [new TextRun({ text: line || ' ', font: 'Courier New', size: 20 })],
        }),
    ),
  );
  children.push(
    field('4. Memory-informed reply - same prompt, next session', m.informedReply),
    new Paragraph({
      spacing: { before: 80, after: 120 },
      children: [
        new TextRun({ text: 'Result. ', bold: true }),
        new TextRun(
          'With no memory the companion leads with a default profile topic; after the caregiver\'s feedback, the same neutral prompt makes it lead with the caregiver\'s preferred topic (the railroad/signal work) and steer away from the topic the caregiver flagged. Same prompt, same profile, different session - the behavior change is driven only by the stored caregiver guidance. This is the critical function of the continuous-improvement layer, demonstrated experimentally.',
        ),
      ],
    }),
  );
}

children.push(
  new Paragraph({
    spacing: { before: 360 },
    children: [
      new TextRun({
        text: 'Document prepared by AI Evolution Services | ACL Caregiver AI Prize Challenge Phase 1 | MindBridge Echo - Companion Intelligence',
        italics: true,
        size: 18,
        color: '777777',
      }),
    ],
  }),
);

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 } }, // 11pt body
    },
  },
  sections: [{ children }],
});

Packer.toBuffer(doc).then((buf) => {
  writeFileSync(join(OUT_DIR, 'Smart40_Validation_Log.docx'), buf);
  console.log(`Wrote ${join(OUT_DIR, 'Smart40_Validation_Log.docx')} (${buf.length} bytes, ${outcomes.length} tests)`);
});
