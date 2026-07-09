# MindBridge Echo — Phase 1 Pilot Build Specification

> **Purpose:** Complete build spec for the MindBridge Echo Phase 1 **pilot product** — a real, deployed, multi-user web app that actual caregivers will use with a care recipient, that tracks their progress, and that generates the 40 validation logs the grant requires. Where marked **[DECISION]**, it's a sensible default you can override.

---

## The vision — what MindBridge Echo is and who it's for

**The problem.** Caring for someone with dementia is relentless. The person you love asks the same question over and over, becomes agitated or frightened without warning, and needs near-constant attention — and there is rarely anyone to hand off to. Family caregivers describe months of exhaustion with no backup and no rest; professional caregivers in assisted-living settings are stretched across many residents at once. Two people are hurting in every one of these situations: the person living with dementia, who is losing their footing in the world, and the caregiver, who is quietly burning out trying to hold it together.

**What MindBridge Echo is.** A warm AI companion that gently engages a person living with dementia in familiar, personalized conversation drawn from their own life — their family, their work, the music and places and people they love. When the caregiver needs a moment — to cook a meal, make a call, or simply breathe — they hand over the device, and Echo keeps their loved one calm, talking, and connected. Over time it learns, with the caregiver's guidance, what settles and engages this specific person, so it gets better at comforting *them* in particular.

**Who it serves — the whole family, equally.**
- **The person with dementia** — preserving their dignity, their sense of self, and calm connection in moments that would otherwise be frightening or lonely.
- **The caregiver** — family members at home and professional caregivers in facilities alike — giving them real, verified breaks and reducing the daily burden that leads to burnout.

**Why it's different.** Echo is designed around the relationship between the two people — it calms the person *and* frees the caregiver in the same moment — and it personalizes to the individual's own life story rather than offering generic chat.

**Product principles:**
1. **Dignity first.** Never talk down to the person with dementia. Meet them where they are; never correct or argue with their reality.
2. **Calm over clever.** Simple, warm, unhurried.
3. **Safety is non-negotiable.** A companion, never a medical device. When anything is beyond it, it steps back and brings in a human.
4. **The caregiver's wellbeing is a goal, not a byproduct.**

**Who's using the pilot.** A mix of **family caregivers** and **professional caregivers / assisted-living staff**. Capture which type a user is at signup.

---

## 0. Scope line

A **usable pilot product**, not a demo — but **ONLY the companion**. Make the companion loop robust and usable for real users.

**In scope:** (1) multi-user auth + per-user isolation; (2) Life Story Profile intake w/ voice; (3) conversation engine; (4) distress detection from transcribed words only; (5) behavioral memory (caregiver scoring + notes reused as context); (6) safety guardrails + HITL flagging; (7) caregiver mode; (8) progress tracking; (9) push-to-talk voice (STT/TTS); (10) consent/onboarding; (11) deploy to Vercel + Supabase; (12) validation harness (40 cycles).

**Out of scope:** voice-tone/acoustic detection; always-on listening; self-training model; care-coordination/calendar/meds/dashboard; caregiver emotional-support module; EHR integration; native mobile; multilingual; billing; admin panels beyond those listed.

---

## 1. Tech stack

- **Framework:** Next.js (App Router) + TypeScript, on **Vercel**
- **UI:** React + Tailwind; charts via `recharts`
- **Backend:** Next.js route handlers / server actions (secrets server-side only)
- **Data + Auth:** **Supabase** — Postgres, Auth (email + password, verification, reset), RLS for isolation. Passwords handled entirely inside Supabase Auth.
- **LLM:** Anthropic Messages API via `@anthropic-ai/sdk`; model via `ANTHROPIC_MODEL`, default `claude-sonnet-5`
- **Voice [DECISION]:** STT via OpenAI Whisper (`whisper-1`) — record in-browser (push-to-talk), upload, transcribe. TTS via OpenAI TTS (`tts-1`, calm, slowed) with browser `SpeechSynthesis` fallback. Wrap both behind `SpeechToText` / `TextToSpeech` interfaces. **Do not persist raw audio.**
- **Deploy:** Vercel + Supabase. All API keys server-side.

---

## 2. Architecture — core turn loop (`/api/message`)
1. Persist incoming message (`user_id`, `session_id`).
2. `AssessmentService.assessTurn()` → structured JSON (distress/safety/uncertainty).
3. If safety-critical OR uncertainty → create a Flag, return a safe holding response + caregiver-handoff; do **not** continue normal conversation.
4. Else `ConversationService.reply()` builds the prompt (persona + safety + profile + memory) → Claude → companion reply.
5. Persist assistant message + assessment; auto-update respite. Return `{ reply, assessment, flags }`.

Keep assessment a **separate Claude call** from the reply.

---

## 3. Supabase schema + RLS
See `supabase/migrations/0001_init.sql`. Every user-owned row carries `user_id`. RLS owner-only policies (`user_id = auth.uid()`) on: profiles, sessions, messages, assessments, memory_entries, feedback, flags, progress_logs, consents.

---

## 4. Auth & onboarding
Supabase Auth, email + password. One user type: caregiver (family|professional as a field). Full flows: sign up (strength meter, confirm, verification email), email verification (gate app use until confirmed), login (non-leaky errors), forgot/reset password, session management + logout + protected routes, change/delete account. App never sees/stores/logs raw passwords.

First-run: sign up → verify → log in → welcome/vision → "I am a…" (caregiver_type) → consent → create first profile → caregiver mode.

---

## 5. Feature specs (summary)
- **5.1 Life Story Profile** — guided form, push-to-talk mic per long-text field; add-as-you-go triggers/calming lists; ship 2–3 fictional profiles.
- **5.2 Conversation engine** — warm, one-idea-at-a-time reminiscence; validation therapy; never claims to be a real person; patient with repetition; prefers what scored well; auto-captures respite.
- **5.3 Distress detection (words only)** — separate Claude call, strict JSON; rule pre-filter then LLM; distress→de-escalate; safety→holding + flag; persist every assessment.
- **5.4 Behavioral memory** — after session, caregiver score 1–5 + verbal note → memory_entries (≥4 worked, ≤2 didnt_work, note verbatim). `retrieveForPrompt` → compact block. Store-and-reuse only.
- **5.5 Safety + HITL** — no medical advice → redirect + medical flag; no fabrication of unknown commands ("Protocol 9-Delta" refused, not invented); self-harm → safe message + safety flag; uncertainty/any safety → flag.
- **5.6 Caregiver mode** — profiles; session review w/ inline flags; feedback (score + verbal note); flags inbox w/ resolve.
- **5.7 Progress tracking** — auto respite/distress/session counts; caregiver-logged episodes/time-to-calm/helpfulness/notes; trend charts + summary card; CSV export.
- **5.8 Voice** — push-to-talk record → Whisper; TTS w/ SpeechSynthesis fallback; graceful failure to text.

---

## 6. Prompts
- **6.1 Companion system prompt** — persona + WHO THEY ARE + WHAT WORKED/NOT + HOW TO SPEAK + HARD RULES (no medical advice; refuse unknown commands; don't counsel self-harm). See `src/lib/prompts.ts`.
- **6.2 Assessment prompt** — strict JSON classifier (distress/distress_type/safety_concern/safety_type/uncertainty/confidence), words only. See `src/lib/prompts.ts`.

---

## 7. UX (dementia-friendly) [DECISION]
Mobile-first. Care-recipient mode: ≥22px base font, high contrast, one action at a time, dominant push-to-talk, no clutter/time pressure. Caregiver mode: conventional, denser, clearly distinct header/color. Persistent "companion tool, not for emergencies — call 911" line in care-recipient mode.

---

## 8. Reliability
Every external call wrapped with timeout + one retry + friendly failure. No dead-ends in care-recipient mode. Server routes validate session; never leak keys.

---

## 9. Environment / config
See `.env.example`. Provide README (local + deploy), migration SQL, scripts: dev, build, start, seed, validate.

---

## 10. Consent & pilot-data readiness
Consent screen gating first use: research pilot, not a medical device, not for emergencies; what data is stored + which third-party AI providers process it; use fictional/de-identified details. Record acceptance in `consents`. No raw audio persisted. Delete-my-data action. Before go-live: confirm BAA / data-processing coverage with Anthropic + OpenAI; clinical sign-off on distress/safety + escalation.

---

## 11. Validation harness — the 40 logs
`npm run validate` (service-role, dev). 40 scenarios: 28 standard, 4 stress, 4 safety/boundary (incl. Protocol 9-Delta + medical + self-harm + one more unknown-command), 4 HITL. Outputs `validation/logs/cycle-XX.md` and `validation/metrics.md` (confusion matrix + precision/recall/F1/accuracy for distress + safety, HITL hit-rate, Protocol 9-Delta refused ✓). Non-zero exit on any safety-critical failure. Reproducible.

---

## 12. Seed data
3 fictional profiles (retired teacher who loves jazz + gardening; former nurse + mother of four calmed by cooking; retired dockworker who lights up about football + the sea). All fictional.

---

## 13. Build order
1. Scaffold + Supabase → 2. Auth + onboarding + consent → 3. Conversation core → 4. Assessment + safety → 5. Memory loop → 6. Caregiver mode → 7. Progress tracking → 8. Voice → 9. Reliability + UX → 10. Deploy → 11. Validation harness.

---

## 14. Acceptance criteria
Signup/verify/login/reset works and gates access; onboarding (welcome → role → consent → first profile w/ ≥1 voice field); care-recipient mode holds a warm push-to-talk conversation w/ TTS + text fallback; distress→de-escalation, safety/medical/unknown-command refused+flagged, Protocol 9-Delta refused not fabricated; caregiver scores + verbal note and next session reflects it; progress view shows trends + CSV; RLS isolates users; deployed + mobile; no raw audio stored; delete-my-data works; `npm run validate` produces 40 reproducible logs + metrics with all safety-critical scenarios passing.

*Builder scope note: coordination/calendar/meds, always-on listening, voice-tone analysis, model training, billing, or anything beyond the companion — out of Phase 1.*
