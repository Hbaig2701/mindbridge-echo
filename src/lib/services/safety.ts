// SafetyService — turns an assessment into caregiver flags.
//
// Flags NEVER interrupt the conversation. The companion always keeps talking; when a
// flag is raised, the reply is shaped to be extra careful (see prompts.safetyGuidanceFor)
// and the caregiver is alerted in the background. A safety flag is a notification, not
// a wall — the person is never left mid-sentence.

import type { AssessmentResult, FlagType, TurnFlag } from '@/lib/types';

export interface SafetyDecision {
  flags: TurnFlag[];
  alertedCaregiver: boolean; // a safety-type flag was raised this turn (for logging/UI)
}

export const SafetyService = {
  decide(
    assessment: AssessmentResult,
    opts: { sustainedDistress?: boolean } = {},
  ): SafetyDecision {
    const flags: TurnFlag[] = [];

    if (assessment.safety_concern) {
      const type: FlagType = assessment.safety_type === 'medical' ? 'medical' : 'safety';
      flags.push({ type, reason: reasonForSafety(assessment) });
    } else if (opts.sustainedDistress) {
      // Distress persisted across consecutive exchanges (e.g. escalating agitation over a
      // deceased spouse). One upset moment is a normal dementia moment the companion
      // handles warmly; SUSTAINED distress means the person likely needs in-person comfort.
      flags.push({
        type: 'safety',
        reason: `Distress has persisted across consecutive exchanges (${assessment.distress_type}) — the person may need in-person comfort from their caregiver.`,
      });
    } else if (assessment.uncertainty) {
      // Uncertainty is a caregiver REVIEW note. The companion still responds warmly.
      flags.push({
        type: 'uncertainty',
        reason: 'The companion was unsure about this moment — worth a caregiver review.',
      });
    }

    // A physical/comfort need raises its own flag (in addition to any above) so the
    // caregiver is told the person needs attention — hunger, thirst, toilet, pain, etc.
    if (assessment.care_need) {
      flags.push({
        type: 'care_need',
        reason: `The person expressed a physical/comfort need (${assessment.care_need_type}) — they need caregiver attention.`,
      });
    }

    return {
      flags,
      alertedCaregiver:
        assessment.safety_concern || assessment.care_need || Boolean(opts.sustainedDistress),
    };
  },
};

function reasonForSafety(a: AssessmentResult): string {
  switch (a.safety_type) {
    case 'self_harm':
      return 'Possible self-harm or crisis language detected. Needs a human immediately.';
    case 'unknown_command':
      return 'An unrecognized official-sounding command was issued; the companion refused and did not act on it.';
    case 'medical':
      return 'A medical/medication question was asked; the companion redirected instead of advising.';
    default:
      return 'A safety concern was detected (possible mistreatment report, elopement risk, or similar) — review the flagged message now.';
  }
}
