-- me2IB database schema
-- Run this ONCE in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE everywhere.

-- ============================================================
-- Helpers
-- ============================================================

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Profiles (one row per auth user, auto-created on signup)
-- ============================================================

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  school text,
  major text,
  minor text,
  grad_year int,
  grad_month int check (grad_month between 1 and 12),
  standing text, -- freshman | sophomore | junior | senior | masters | standard student
  gpa text,
  city text,
  phone text,
  linkedin_url text,
  target_industries text[] default '{}',
  clubs text,                 -- clubs & activities
  professional_summary text,  -- experience blurb
  personal_interests text,    -- hobbies, sports, random interests: used to find common ground
  fun_facts text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Contacts
-- ============================================================

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  company text,
  position text,
  email text,
  phone text,
  linkedin_url text,
  photo_url text,
  location text,
  industry text,
  how_met text,                -- coffee chat, alumni database, club event, cold email, mutual friend...
  connection_strength int check (connection_strength between 1 and 5) default 2,
  relationship text,           -- who they are / what they do / why they matter
  shared_interests text,       -- common ground for outreach
  alma_mater text,
  notes text,
  tags text[] default '{}',
  last_contacted date,
  followup_interval_days int default 21,
  status text default 'active', -- active | warm | dormant | archived
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_user_idx on public.contacts (user_id);

alter table public.contacts enable row level security;
drop policy if exists "contacts_all_own" on public.contacts;
create policy "contacts_all_own" on public.contacts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- ============================================================
-- Applications
-- ============================================================

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  company text not null,
  position text,
  industry text default 'finance',   -- finance | consulting | marketing | operations | tech | other
  sector text,                       -- e.g. healthcare, industrials, TMT, energy (consulting/banking coverage)
  tier text,                         -- finance: BB | EB | MM | boutique | ... ; consulting: MBB | T2 | Big4 | boutique
  location text,
  work_type text,                    -- in-person | hybrid | remote
  employment_type text default 'internship', -- internship | full-time | externship | program
  season text,                       -- e.g. "Summer 2027"
  hours_per_week text,
  pay text,
  status text default 'not_started', -- not_started | in_progress | submitted | online_assessment | phone_screen | first_round | superday | offer | rejected | withdrawn | waitlisted
  priority text default 'target',    -- dream | target | safety
  deadline date,
  date_applied date,
  application_link text,
  posting_link text,
  referral_contact_id uuid references public.contacts (id) on delete set null,
  networked boolean default false,
  resume_status text default 'not_started',       -- not_started | drafting | tailored | submitted
  cover_letter_status text default 'not_required', -- not_required | needed | drafting | done | submitted
  materials_needed text,             -- e.g. transcript, writing sample
  missing_items text,
  interview_notes text,
  open_questions text,
  next_step text,
  next_step_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_idx on public.applications (user_id);

alter table public.applications enable row level security;
drop policy if exists "applications_all_own" on public.applications;
create policy "applications_all_own" on public.applications for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- ============================================================
-- Calendar events
-- ============================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  description text,
  event_type text default 'other', -- interview | coffee_chat | networking | info_session | deadline | meeting | followup | other
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean default false,
  location text,
  contact_id uuid references public.contacts (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  completed boolean default false,
  source text default 'manual', -- manual | smart
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_user_idx on public.events (user_id, start_at);

alter table public.events enable row level security;
drop policy if exists "events_all_own" on public.events;
create policy "events_all_own" on public.events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ============================================================
-- Documents (resumes, cover letters, essays)
-- ============================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  doc_type text default 'resume', -- resume | cover_letter | transcript | essay | writing_sample | other
  industry_target text,           -- which industry/job this version targets
  file_path text,                 -- storage path in the "documents" bucket
  content_text text,              -- pasted text version (used for AI review)
  notes text,
  ai_feedback jsonb,              -- { overview, strengths[], improvements[], verdict }
  ai_feedback_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_idx on public.documents (user_id);

alter table public.documents enable row level security;
drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own" on public.documents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists documents_updated_at on public.documents;
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

-- ============================================================
-- Experiences (work / projects log -> compiled resume material)
-- ============================================================

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  organization text,
  role_type text default 'internship', -- internship | job | club | project | research | volunteer
  start_date date,
  end_date date,
  is_current boolean default false,
  location text,
  description text,     -- what the role/project is
  bullets text,         -- accomplishment bullets, one per line
  skills text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists experiences_user_idx on public.experiences (user_id);

alter table public.experiences enable row level security;
drop policy if exists "experiences_all_own" on public.experiences;
create policy "experiences_all_own" on public.experiences for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists experiences_updated_at on public.experiences;
create trigger experiences_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();

-- ============================================================
-- Story bank (behavioral question prep)
-- ============================================================

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  question text not null,     -- e.g. "Tell me about a time you faced a challenge"
  category text default 'behavioral', -- behavioral | why_firm | why_industry | leadership | teamwork | failure | technical | other
  answer text,
  notes text,
  strength text default 'draft', -- draft | solid | polished
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stories_user_idx on public.stories (user_id);

alter table public.stories enable row level security;
drop policy if exists "stories_all_own" on public.stories;
create policy "stories_all_own" on public.stories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists stories_updated_at on public.stories;
create trigger stories_updated_at before update on public.stories
  for each row execute function public.set_updated_at();

-- ============================================================
-- Opportunities (scanned/saved postings)
-- ============================================================

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  company text,
  industry text,
  location text,
  link text,
  source text,               -- where it was found
  deadline date,
  notes text,
  status text default 'new', -- new | saved | added_to_tracker | dismissed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_user_idx on public.opportunities (user_id);

alter table public.opportunities enable row level security;
drop policy if exists "opportunities_all_own" on public.opportunities;
create policy "opportunities_all_own" on public.opportunities for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists opportunities_updated_at on public.opportunities;
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

-- ============================================================
-- Plans (generated recruitment roadmaps)
-- ============================================================

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  target_industry text,
  grad_year int,
  grad_month int,
  standing text,
  plan_markdown text,        -- the generated roadmap
  generated_by text default 'rules', -- rules | ai
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_user_idx on public.plans (user_id);

alter table public.plans enable row level security;
drop policy if exists "plans_all_own" on public.plans;
create policy "plans_all_own" on public.plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists plans_updated_at on public.plans;
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ============================================================
-- Storage: private "documents" bucket (users can only touch their own folder)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_bucket_select_own" on storage.objects;
create policy "documents_bucket_select_own" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_bucket_insert_own" on storage.objects;
create policy "documents_bucket_insert_own" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_bucket_update_own" on storage.objects;
create policy "documents_bucket_update_own" on storage.objects for update
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "documents_bucket_delete_own" on storage.objects;
create policy "documents_bucket_delete_own" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
