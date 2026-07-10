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
  decide(assessment: AssessmentResult): SafetyDecision {
    const flags: TurnFlag[] = [];

    if (assessment.safety_concern) {
      const type: FlagType = assessment.safety_type === 'medical' ? 'medical' : 'safety';
      flags.push({ type, reason: reasonForSafety(assessment) });
    } else if (assessment.uncertainty) {
      // Uncertainty is a caregiver REVIEW note. The companion still responds warmly.
      flags.push({
        type: 'uncertainty',
        reason: 'The companion was unsure about this moment — worth a caregiver review.',
      });
    }

    return { flags, alertedCaregiver: assessment.safety_concern };
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
      return 'A safety concern was detected in the conversation.';
  }
}
