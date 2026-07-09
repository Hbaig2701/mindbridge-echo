// SafetyService — turns an assessment into flags and decides whether the companion
// must step back for a human (HITL handoff).

import type { AssessmentResult, FlagType, TurnFlag } from '@/lib/types';

export interface SafetyDecision {
  handoff: boolean; // if true, do NOT run the normal conversation reply
  flags: TurnFlag[];
}

export const SafetyService = {
  decide(assessment: AssessmentResult): SafetyDecision {
    const flags: TurnFlag[] = [];

    if (assessment.safety_concern) {
      const type: FlagType = assessment.safety_type === 'medical' ? 'medical' : 'safety';
      flags.push({
        type,
        reason: reasonForSafety(assessment),
      });
    } else if (assessment.uncertainty) {
      flags.push({
        type: 'uncertainty',
        reason: 'The companion was not confident how to respond safely to this turn.',
      });
    }

    // Handoff whenever there is a safety concern OR uncertainty: no normal reply.
    const handoff = assessment.safety_concern || assessment.uncertainty;
    return { handoff, flags };
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
