# MindBridge Echo — Phase 1 Pilot

A warm AI companion for people living with dementia — and real, verified breaks for
the caregivers who love them. Echo gently engages a person in personalized
reminiscence drawn from their own life story, so their caregiver can rest. It is a
**companion, not a medical device**, with safety guardrails and human-in-the-loop
escalation built in.

This repository is the deployable **pilot product**: multi-user auth, per-user data
isolation (Supabase RLS), the companion conversation loop, distress/safety detection
(from words only), a caregiver learning loop, progress tracking, push-to-talk voice,
consent onboarding, and a 40-cycle validation harness.

> ⚠️ **Before going live to real caregivers** (see `SPEC` §10): confirm a Business
> Associate Agreement / data-processing coverage with **Anthropic** and **OpenAI**,
> and obtain clinical sign-off on the distress/safety + escalation behavior. During
> the pilot, use **fictional or de-identified** profile details only.

---

## Tech stack

- **Next.js 16** (App Router) + TypeScript, deployed on **Vercel**
- **Tailwind v4** + **recharts**
- **Supabase** — Postgres, Auth (email + password, verification, reset), Row Level Security
- **Anthropic** Messages API (companion + a separate safety/distress classifier)
- **OpenAI** — Whisper (`whisper-1`) STT + TTS (`tts-1`); **raw audio is never persisted**

---

## Local setup

### 1. Prerequisites
- Node 20+ (Node 24 tested), npm
- A Supabase project (free tier is fine)
- Anthropic API key, OpenAI API key

### 2. Install
```bash
npm install
```

### 3. Environment
Copy `.env.example` → `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only; never exposed to the browser
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-5      # verify the latest Sonnet string
OPENAI_API_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CONSENT_VERSION=2026-07-pilot-1
```

### 4. Database
Run the migration in the Supabase SQL editor (or via the Supabase CLI):
```
supabase/migrations/0001_init.sql
```
This creates every table, indexes, and enables **Row Level Security** with owner-only
policies (`user_id = auth.uid()`) on all user tables.

**Supabase Auth settings:** enable Email provider, turn **on** "Confirm email", and add
your site + `…/auth/confirm` to the allowed redirect URLs (Authentication → URL
Configuration). Set the Site URL to your deployed origin (or `http://localhost:3000`
locally).

### 5. Seed demo data (optional but recommended)
```bash
npm run seed
```
Creates a demo caregiver user and 3 **fictional** care-recipient profiles (fixed
UUIDs) used by the demo and the validation harness.

### 6. Run
```bash
npm run dev
```
Open http://localhost:3000. Sign up → verify email → onboard (vision → role → consent
→ first profile) → caregiver mode. Hand the device to the person and tap **Start
companion session** for care-recipient mode.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Seed the demo user + 3 fictional profiles |
| `npm run validate` | Run the 40-cycle validation harness (see below) |

---

## Validation harness (the 40 logs)

```bash
npm run validate
```
Runs 40 scenarios (28 standard, 4 stress, 4 safety/boundary, 4 human-in-the-loop)
through the **real** services (same turn loop as production). Outputs:
- `validation/logs/cycle-XX.md` — per-cycle: input → assessment JSON → reply → flags → pass/fail
- `validation/metrics.md` — confusion matrices + precision/recall/F1/accuracy for the
  distress and safety detectors, HITL hit-rate, and an explicit "Protocol 9-Delta refused" check

Exits non-zero if any safety-critical scenario fails. Requires the same env as the app
(service-role key + Anthropic key); it ensures the demo user + seed profiles exist.

---

## Deploy (Vercel + Supabase)

1. Push this repo to GitHub and import it into **Vercel**.
2. In Vercel → Project → Settings → **Environment Variables**, add every var from
   `.env.example` (set `NEXT_PUBLIC_SITE_URL` to your Vercel domain).
3. In **Supabase** → Authentication → URL Configuration, set the **Site URL** to your
   Vercel domain and add `https://<your-domain>/auth/confirm` to redirect URLs.
4. Run `supabase/migrations/0001_init.sql` against the production database.
5. Deploy. Optionally run `npm run seed` locally against the production Supabase to
   create demo profiles.

The app is **mobile-first** and works on a phone via the public URL.

---

## Architecture (short)

- **Core turn loop** (`src/lib/services/turn.ts`, exposed at `/api/message`): persist
  message → **separate** assessment call → safety decision (flag + handoff on
  safety/uncertainty) → companion reply (or safe holding response) → persist +
  auto-accrue respite.
- **Services**: `assessment` (rule pre-filter + LLM classifier, words only),
  `safety` (flags + HITL handoff), `conversation` (companion prompt), `memory`
  (store-and-reuse learning loop), `progress` (trends + CSV).
- **Data isolation**: every user-owned row carries `user_id`; RLS enforces
  owner-only access as defense-in-depth behind app-level auth.
- **Privacy**: push-to-talk only (never always-on); audio is transcribed and
  discarded, never stored; delete-my-data cascades all rows.

---

## Scope

This pilot is **only the companion**, made robust for real users. Out of scope
(future phases): voice-tone/acoustic detection, always-on listening, model
fine-tuning, care-coordination/meds/calendar, EHR integration, native mobile,
multilingual, billing. See `SPEC` for the full scope line.
