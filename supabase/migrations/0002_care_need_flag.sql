-- Allow a 'care_need' flag type: the person expressed a physical/comfort need
-- (hungry, thirsty, needs the toilet, in pain, etc.) that the caregiver should
-- attend to. Not a safety emergency — the companion still responds warmly — but
-- the caregiver gets a flag so they know the person needs attention.
--
-- Run this against the pilot database after 0001_init.sql.

alter table flags drop constraint if exists flags_type_check;
alter table flags
  add constraint flags_type_check
  check (type in ('safety', 'uncertainty', 'medical', 'care_need'));
