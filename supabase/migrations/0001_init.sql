-- MindBridge Echo — Phase 1 pilot schema + Row Level Security.
-- Every user-owned row carries user_id (denormalized onto child tables) so RLS
-- stays simple and fast: owner = auth.uid().

-- Extensions
create extension if not exists "pgcrypto";

-- PROFILES (fictional / de-identified care recipient)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  age int,
  life_story jsonb not null default '{}',
  known_triggers jsonb not null default '[]',
  known_calming_strategies jsonb not null default '[]',
  is_fictional boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  mode text not null check (mode in ('care_recipient','caregiver')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  respite_seconds int not null default 0,
  test_scenario_id text
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  input_channel text not null default 'text' check (input_channel in ('voice','text')),
  created_at timestamptz not null default now()
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  distress boolean not null default false,
  distress_type text not null default 'none',
  safety_concern boolean not null default false,
  safety_type text not null default 'none',
  uncertainty boolean not null default false,
  confidence real not null default 0,
  raw jsonb
);

create table if not exists memory_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  kind text not null check (kind in ('worked','didnt_work','caregiver_note')),
  content text not null,
  score int,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  score int not null check (score between 1 and 5),
  verbal_note text,
  created_at timestamptz not null default now()
);

create table if not exists flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  type text not null check (type in ('safety','uncertainty','medical')),
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- PROGRESS: mix of auto-captured + caregiver-logged
create table if not exists progress_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  logged_at timestamptz not null default now(),
  source text not null default 'caregiver' check (source in ('caregiver','auto')),
  agitation_episode boolean not null default false,
  time_to_calm_min numeric,
  respite_min numeric,
  companion_helpful int check (companion_helpful between 1 and 5),
  note text
);

-- consent record + caregiver type
create table if not exists consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  caregiver_type text check (caregiver_type in ('family','professional')),
  agreed boolean not null default false,
  version text not null,
  agreed_at timestamptz not null default now()
);

-- Helpful indexes for the common access paths.
create index if not exists idx_sessions_profile on sessions(profile_id);
create index if not exists idx_messages_session on messages(session_id, created_at);
create index if not exists idx_assessments_message on assessments(message_id);
create index if not exists idx_memory_profile on memory_entries(profile_id);
create index if not exists idx_flags_user_open on flags(user_id) where resolved = false;
create index if not exists idx_progress_profile on progress_logs(profile_id, logged_at);

-- Enable RLS + owner-only policies on every user table.
do $$
declare t text;
begin
  foreach t in array array['profiles','sessions','messages','assessments',
    'memory_entries','feedback','flags','progress_logs','consents']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "own_%1$s_select" on %1$I;', t);
    execute format('drop policy if exists "own_%1$s_write" on %1$I;', t);
    execute format($f$create policy "own_%1$s_select" on %1$I for select using (user_id = auth.uid());$f$, t);
    execute format($f$create policy "own_%1$s_write"  on %1$I for all   using (user_id = auth.uid()) with check (user_id = auth.uid());$f$, t);
  end loop;
end $$;
