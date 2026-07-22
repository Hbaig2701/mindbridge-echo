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
import { holdingResponse, safetyGuidanceFor } from '@/lib/prompts';
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
  // 0. Load the MOST RECENT 40 messages for context (before inserting the new one).
  // Fetch newest-first, then reverse to chronological order so `recent` ends with the
  // latest turn and `lastCreatedAt` is the true previous message (not the 40th-oldest).
  const { data: priorRows } = await db
    .from('messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(40);

  const prior = ((priorRows ?? []) as { role: string; content: string; created_at: string }[])
    .slice()
    .reverse();
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

  // 2. LATENCY: run the assessment (rule + Claude classifier) and the companion reply
  // CONCURRENTLY instead of one-after-the-other. The reply is shaped by an INSTANT
  // rule-based read (quickRead) that catches the obvious/hard cases immediately; the
  // full LLM classification runs in parallel and only forces a reply regeneration in
  // the rare case it finds a safety/care concern the rules missed.
  const quick = AssessmentService.quickRead(content, recent);
  const memoryBlock = await MemoryService.retrieveForPrompt(db, profile.id);

  const replyPromise = ConversationService.reply({
    profile,
    memoryBlock,
    distressed: quick.distressed,
    recent,
    latest: content,
    safetyNote: quick.safetyNote,
  }).catch(() => holdingResponse()); // never dead-end

  const assessment: AssessmentResult = await AssessmentService.assessTurn(content, recent);
  let reply = await replyPromise;

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

  // 3. Safety decision. Distress on this turn AND the immediately preceding user turn
  // counts as SUSTAINED distress → background caregiver flag (one upset moment doesn't).
  let sustainedDistress = false;
  if (assessment.distress && !assessment.safety_concern) {
    const { data: prevUserMsg } = await db
      .from('messages')
      .select('id')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .neq('id', userMsg.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const prevId = prevUserMsg?.[0]?.id as string | undefined;
    if (prevId) {
      const { data: prevAssess } = await db
        .from('assessments')
        .select('distress')
        .eq('message_id', prevId)
        .limit(1);
      sustainedDistress = Boolean(prevAssess?.[0]?.distress);
    }
  }
  const decision = SafetyService.decide(assessment, { sustainedDistress });

  // Create flag rows. Never let a flag insert break the conversation (e.g. if the
  // care_need migration 0002 hasn't been applied yet, the type CHECK would reject it).
  if (decision.flags.length) {
    const { error: flagErr } = await db.from('flags').insert(
      decision.flags.map((f) => ({
        user_id: userId,
        session_id: sessionId,
        message_id: userMsg.id,
        type: f.type,
        reason: f.reason,
      })),
    );
    if (flagErr) console.error('[turn] flag insert failed (conversation continues):', flagErr.message);
  }

  // 4/5. If the LLM classifier found a safety/care concern the instant rule read did
  // NOT catch, the parallel reply wasn't shaped for it → regenerate it (rare). This
  // keeps safety correct while making the common case as fast as a single call.
  const missedSafety = assessment.safety_concern && !quick.hadSafety;
  const missedCareNeed = assessment.care_need && !quick.hadCareNeed;
  if (missedSafety || missedCareNeed) {
    try {
      reply = await ConversationService.reply({
        profile,
        memoryBlock,
        distressed: assessment.distress,
        recent,
        latest: content,
        safetyNote: safetyGuidanceFor(assessment),
      });
    } catch {
      reply = holdingResponse();
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
    // The companion never hands off / goes silent now; a flag is raised in the
    // background. `alertedCaregiver` is informational for the caller.
    handoff: false,
    alertedCaregiver: decision.alertedCaregiver,
  };
}
