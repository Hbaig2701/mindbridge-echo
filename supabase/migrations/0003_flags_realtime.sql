-- Deliver caregiver flags as real-time push notifications.
--
-- Adds `flags` to the supabase_realtime publication so the caregiver dashboard
-- (FlagAlerts component) receives INSERT events over websocket the moment the
-- companion raises a flag. Delivery is scoped by the existing RLS policy
-- (user_id = auth.uid()), so caregivers only ever receive their own flags.
--
-- Run this against the pilot database after 0002_care_need_flag.sql.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'flags'
  ) then
    alter publication supabase_realtime add table public.flags;
  end if;
end $$;
