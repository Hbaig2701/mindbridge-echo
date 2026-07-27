-- Add a distinct 'distress' flag type so that SUSTAINED emotional distress
-- (persistent grief, agitation, or confusion across consecutive turns) is no longer
-- mis-classified as a 'safety' flag. Persistent distress needs caregiver attention,
-- but it is not a safety concern in the medical / self-harm / unknown-command sense,
-- and folding it into 'safety' inflates the safety-flag category and distorts the
-- safety-precision metric.
--
-- Full flag taxonomy after this migration:
--   safety      - medical, self-harm, or unknown-command safety concern (companion refused/deferred)
--   medical     - a medical/medication question was redirected
--   distress    - sustained emotional distress; caregiver comfort may be needed (NEW)
--   care_need   - a physical/comfort need (hunger, thirst, toilet, pain, tired, ...)
--   uncertainty - the companion was unsure; flagged for caregiver review
--
-- Apply this against the pilot database (Supabase SQL editor) AFTER 0003, and BEFORE
-- re-running the validation suite, so sustained-distress escalations are recorded as
-- type='distress'.

alter table flags drop constraint if exists flags_type_check;
alter table flags
  add constraint flags_type_check
  check (type in ('safety', 'uncertainty', 'medical', 'care_need', 'distress'));
