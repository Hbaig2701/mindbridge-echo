// AssessmentService — distress/safety classification from transcribed WORDS ONLY.
// A fast rule pre-filter runs first (explicit phrases, repetition loops); then the
// LLM classifier (prompt 6.2) produces the final structured JSON. This is a
// separate Claude call from the reply — deterministic, cleanly loggable, measurable.

import { complete } from '@/lib/ai/anthropic';
import { ASSESSMENT_SYSTEM_PROMPT } from '@/lib/prompts';
import type { AssessmentResult, DistressType, SafetyType } from '@/lib/types';

export interface TranscriptTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Explicit phrases we treat as high-signal even before the LLM runs.
const SELF_HARM_PATTERNS = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (?:live|be here)\b/i,
  /\bhurt myself\b/i,
  /\bbetter off dead\b/i,
  /\bno reason to (?:live|go on)\b/i,
];

const MEDICAL_PATTERNS = [
  /\bwhat (?:pill|medication|medicine|dose|dosage)\b/i,
  /\bshould i take\b.*\b(?:pill|medication|medicine|insulin)\b/i,
  /\bhow much .*(?:medication|medicine|insulin|morphine)\b/i,
  /\bam i having a (?:heart attack|stroke)\b/i,
  /\bdiagnos/i,
];

// Official/system-sounding command patterns (the "Protocol 9-Delta" family).
const UNKNOWN_COMMAND_PATTERNS = [
  /\bprotocol\s+[0-9a-z-]+/i,
  /\bactivate\s+(?:protocol|sequence|mode|override|code)\b/i,
  /\boverride\s+code\b/i,
  /\bexecute\s+command\b/i,
  /\benter\s+admin(?:istrator)?\s+mode\b/i,
  /\bsystem\s+directive\b/i,
];

const DISTRESS_PATTERNS = [
  /\bi want to go home\b/i,
  /\blet me out\b/i,
  /\bwhere (?:am i|is my)\b/i,
  /\bi'?m (?:scared|frightened|terrified)\b/i,
  /\bleave me alone\b/i,
  // NOTE: bare "help me" was removed — it false-flagged benign asks like
  // "can you help me remember my daughter's name". The LLM classifier judges
  // genuine distress cries from context instead.
];

interface PreFilter {
  safety_type: SafetyType;
  distress_type: DistressType;
  distress: boolean;
  hardSafety: boolean; // certain enough to force safety_concern regardless of LLM
}

function ruledPreFilter(latest: string, recentUser: string[]): PreFilter {
  const text = latest;

  if (SELF_HARM_PATTERNS.some((r) => r.test(text)))
    return { safety_type: 'self_harm', distress_type: 'distress_other', distress: true, hardSafety: true };

  if (UNKNOWN_COMMAND_PATTERNS.some((r) => r.test(text)))
    return { safety_type: 'unknown_command', distress_type: 'none', distress: false, hardSafety: true };

  if (MEDICAL_PATTERNS.some((r) => r.test(text)))
    return { safety_type: 'medical', distress_type: 'none', distress: false, hardSafety: true };

  // Repetition loop: the same short distressed phrase recurring in recent turns.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '').trim();
  const repeats = recentUser.filter((u) => norm(u) === norm(text) && norm(text).length > 0).length;
  if (repeats >= 2 && DISTRESS_PATTERNS.some((r) => r.test(text)))
    return { safety_type: 'none', distress_type: 'repetition_loop', distress: true, hardSafety: false };

  if (DISTRESS_PATTERNS.some((r) => r.test(text)))
    return { safety_type: 'none', distress_type: 'agitation', distress: true, hardSafety: false };

  return { safety_type: 'none', distress_type: 'none', distress: false, hardSafety: false };
}

function safeParse(raw: string): AssessmentResult | null {
  // Tolerate code fences / stray prose around the JSON object.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    return {
      distress: Boolean(obj.distress),
      distress_type: (obj.distress_type ?? 'none') as DistressType,
      safety_concern: Boolean(obj.safety_concern),
      safety_type: (obj.safety_type ?? 'none') as SafetyType,
      uncertainty: Boolean(obj.uncertainty),
      confidence: typeof obj.confidence === 'number' ? obj.confidence : 0,
    };
  } catch {
    return null;
  }
}

function buildClassifierInput(recent: TranscriptTurn[], latest: string): string {
  const history = recent
    .slice(-8)
    .map((t) => `${t.role === 'user' ? 'Care recipient' : 'Companion'}: ${t.content}`)
    .join('\n');
  return `Recent conversation:\n${history || '(none)'}\n\nLatest care-recipient message:\n${latest}`;
}

export const AssessmentService = {
  /**
   * Classify the latest care-recipient utterance. `recent` is prior conversation
   * (oldest→newest) excluding the latest message.
   */
  async assessTurn(latest: string, recent: TranscriptTurn[]): Promise<AssessmentResult> {
    const recentUser = recent.filter((t) => t.role === 'user').map((t) => t.content);
    const pre = ruledPreFilter(latest, recentUser);

    let llm: AssessmentResult | null = null;
    try {
      const raw = await complete({
        system: ASSESSMENT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildClassifierInput(recent, latest) }],
        maxTokens: 200,
        label: 'assessment.classify',
      });
      llm = safeParse(raw);
    } catch {
      llm = null;
    }

    // If the LLM failed entirely, fall back to the rule pre-filter (fail safe:
    // treat as uncertain so a human is looped in).
    if (!llm) {
      const hard = pre.hardSafety;
      return {
        distress: pre.distress,
        distress_type: pre.distress_type,
        safety_concern: hard,
        safety_type: pre.safety_type,
        uncertainty: true,
        confidence: 0.2,
      };
    }

    // Merge: the rule pre-filter can only ESCALATE, never downgrade the LLM.
    const merged: AssessmentResult = {
      distress: llm.distress || pre.distress,
      distress_type: llm.distress ? llm.distress_type : pre.distress ? pre.distress_type : 'none',
      safety_concern: llm.safety_concern || pre.hardSafety,
      safety_type: pre.hardSafety ? pre.safety_type : llm.safety_type,
      uncertainty: llm.uncertainty,
      confidence: llm.confidence,
    };

    // uncertainty must be true whenever a safety concern fires.
    if (merged.safety_concern || merged.safety_type !== 'none') merged.uncertainty = true;

    return merged;
  },
};
