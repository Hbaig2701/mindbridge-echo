// The core turn loop (SPEC §2). One care-recipient utterance in → persisted
// messages, assessment, flags, respite accrual, and a reply out.
//
// Reused by BOTH /api/message (as the logged-in user) and the validation harness
// (service-role) so the 40 logs exercise the real path.

import type { SupabaseClient } from '@supabase/supabase-js';
import { AssessmentService, type TranscriptTurn } from './assessment';
import { SafetyService } from './safety';
import { ConversationService } from './conversation';
import { MemoryService } from './memory';
import { holdingResponse } from '@/lib/prompts';
import type { AssessmentResult, InputChannel, MessageTurnResponse, Profile } from '@/lib/types';

const MAX_RESPITE_GAP_SECONDS = 180; // don't count long idle gaps as respite

interface RunTurnArgs {
  db: SupabaseClient;
  userId: string;
  sessionId: string;
  profile: Profile;
  content: string;
  inputChannel?: InputChannel;
}

export async function runTurn({
  db,
  userId,
  sessionId,
  profile,
  content,
  inputChannel = 'text',
}: RunTurnArgs): Promise<MessageTurnResponse> {
  // 0. Load recent conversation for context (before inserting the new message).
  const { data: priorRows } = await db
    .from('messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(40);

  const prior = (priorRows ?? []) as { role: string; content: string; created_at: string }[];
  const recent: TranscriptTurn[] = prior
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  const lastCreatedAt = prior.length ? prior[prior.length - 1].created_at : null;

  // 1. Persist the incoming care-recipient message.
  const { data: userMsg, error: insErr } = await db
    .from('messages')
    .insert({
      user_id: userId,
      session_id: sessionId,
      role: 'user',
      content,
      input_channel: inputChannel,
    })
    .select('id, created_at')
    .single();
  if (insErr || !userMsg) throw new Error(`Failed to persist message: ${insErr?.message}`);

  // 2. Assess the turn (separate Claude call).
  const assessment: AssessmentResult = await AssessmentService.assessTurn(content, recent);

  // Persist the assessment (linked to the user message).
  await db.from('assessments').insert({
    user_id: userId,
    message_id: userMsg.id,
    distress: assessment.distress,
    distress_type: assessment.distress_type,
    safety_concern: assessment.safety_concern,
    safety_type: assessment.safety_type,
    uncertainty: assessment.uncertainty,
    confidence: assessment.confidence,
    raw: assessment,
  });

  // 3. Safety decision.
  const decision = SafetyService.decide(assessment);

  // Create flag rows.
  if (decision.flags.length) {
    await db.from('flags').insert(
      decision.flags.map((f) => ({
        user_id: userId,
        session_id: sessionId,
        message_id: userMsg.id,
        type: f.type,
        reason: f.reason,
      })),
    );
  }

  // 4/5. Build the reply.
  let reply: string;
  if (decision.handoff) {
    // Safety-critical OR uncertainty → safe holding response, no normal conversation.
    reply = holdingResponse(profile);
  } else {
    const memoryBlock = await MemoryService.retrieveForPrompt(db, profile.id);
    try {
      reply = await ConversationService.reply({
        profile,
        memoryBlock,
        distressed: assessment.distress,
        recent,
        latest: content,
      });
    } catch {
      // Reliability: never dead-end. Fall back to a warm holding line.
      reply =
        "I'm right here with you. Let's take a slow breath together — tell me about something that makes you smile.";
    }
  }

  // Persist the assistant reply.
  await db.from('messages').insert({
    user_id: userId,
    session_id: sessionId,
    role: 'assistant',
    content: reply,
    input_channel: 'text',
  });

  // Auto-accrue respite: clamp the gap since the previous turn.
  if (lastCreatedAt) {
    const gapSec = Math.max(
      0,
      Math.min(
        MAX_RESPITE_GAP_SECONDS,
        (new Date(userMsg.created_at).getTime() - new Date(lastCreatedAt).getTime()) / 1000,
      ),
    );
    if (gapSec > 0) {
      // Increment respite_seconds by the (clamped) active gap.
      const { data: sess } = await db
        .from('sessions')
        .select('respite_seconds')
        .eq('id', sessionId)
        .single();
      const current = (sess?.respite_seconds as number) ?? 0;
      await db
        .from('sessions')
        .update({ respite_seconds: Math.round(current + gapSec) })
        .eq('id', sessionId);
    }
  }

  return {
    reply,
    assessment,
    flags: decision.flags,
    handoff: decision.handoff,
  };
}
