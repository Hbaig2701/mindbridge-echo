# MindBridge Echo — Phase 1 Pilot Build Specification

> **Purpose:** Complete build spec for the MindBridge Echo Phase 1 **pilot product** — a real, deployed, multi-user web app that actual caregivers will use with a care recipient, that tracks their progress, and that generates the 40 validation logs the grant requires. Where marked **[DECISION]**, it's a sensible default you can override.

The authoritative source for this build is `MindBridge_Echo_Pilot_BUILD_SPEC.md` (as delivered). This `SPEC.md` is the repo-root copy referenced by the build. The full text is reproduced there; the summary below captures the scope and build order this implementation follows.

---

## Scope

**In scope (built):**
1. Multi-user auth (caregivers) with per-user data isolation (Supabase RLS)
2. Life Story Profile — structured intake, including voice input
3. Conversation engine — the companion (care-recipient mode)
4. Distress detection — from transcribed words only, not voice tone
5. Behavioral memory — caregiver scoring + verbal notes, reused as context
6. Safety guardrails + human-in-the-loop flagging
7. Caregiver mode — intake, session review, scoring, feedback, flags inbox
8. Progress tracking — caregiver-facing logging + trends over time
9. Push-to-talk voice (button-activated, not always-on), real STT/TTS
10. Consent / pilot onboarding flow
11. Deployment to Vercel + Supabase
12. Validation harness — 40 test cycles — logs + metrics

**Out of scope (future phases):** voice-tone/acoustic agitation detection; always-on/ambient listening; self-training/fine-tuned model; care-coordination/calendar/medication/dashboard; caregiver emotional-support module; EHR/patient-portal integration; native mobile app; multilingual; payments/billing; admin panels beyond those listed.

## Product principles
1. **Dignity first** — never talk down; never correct or argue with their reality.
2. **Calm over clever** — simple, warm, unhurried.
3. **Safety is non-negotiable** — a companion, never a medical device; step back and bring in a human when beyond it.
4. **The caregiver's wellbeing is a goal, not a byproduct.**

## Build order (followed by this implementation)
1. Scaffold + Supabase (Next.js/TS/Tailwind, clients, migration, seed, SDKs, env)
2. Auth + onboarding + consent (full email/password flows, welcome/vision, caregiver_type, consent gate, RLS)
3. Conversation core (`/api/message`, ConversationService, companion prompt, care-recipient mode)
4. Assessment + safety (classifier, SafetyService, flags, HITL handoff, Protocol 9-Delta refusal)
5. Memory loop (feedback capture, MemoryService, prompt injection, cross-session reuse)
6. Caregiver mode (profiles, session review, feedback, flags inbox)
7. Progress tracking (auto-capture + logging + charts + CSV export)
8. Voice (Whisper STT + TTS behind interfaces, text fallback)
9. Reliability + dementia-friendly UX pass
10. Deploy (Vercel + Supabase, env, README)
11. Validation harness (scenarios, runner, logs + metrics — gating deliverable)

See the README for setup, scripts, and deployment. Open items before go-live (BAA/data-processing with Anthropic + OpenAI; clinical sign-off on safety/escalation) are tracked in the README and must be confirmed before real caregivers use the pilot.
