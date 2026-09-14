-- Phase 8: Agent 2 full-lifecycle expansion — richer application/interview
-- status model, unlimited labeled interview rounds, resume tracking, source
-- free-text, and two new tables (application_events, follow_ups) driving the
-- timeline + follow-up features. Same flat RLS ownership pattern as every
-- prior migration. Purely additive: no existing column is dropped or
-- renamed, so no backfill is required for current rows.

-- Enum additions must each run as their own statement and not be referenced
-- later in this same transaction (safe under Postgres >= 12).
alter type public.application_source add value if not exists 'naukrigulf';
alter type public.application_source add value if not exists 'gulftalent';

alter type public.application_status add value if not exists 'saved';
alter type public.application_status add value if not exists 'waiting_response';
alter type public.application_status add value if not exists 'response_received';
alter type public.application_status add value if not exists 'hired';
alter type public.application_status add value if not exists 'no_response';
alter type public.application_status add value if not exists 'candidate_rejected';
alter type public.application_status add value if not exists 'on_hold';
alter type public.application_status add value if not exists 'closed';

alter type public.interview_type add value if not exists 'hr_screening';
alter type public.interview_type add value if not exists 'recruiter_call';
alter type public.interview_type add value if not exists 'technical';
alter type public.interview_type add value if not exists 'design';
alter type public.interview_type add value if not exists 'portfolio_review';
alter type public.interview_type add value if not exists 'hiring_manager';
alter type public.interview_type add value if not exists 'final';
alter type public.interview_type add value if not exists 'other';

-- Final outcome is deliberately a separate concept from `status`: `status` is
-- the working lifecycle stage, `final_outcome` is the (nullable) resolution.
-- Conflating them was the original schema's limitation the spec calls out.
create type public.final_outcome as enum (
  'offer_received', 'offer_accepted', 'offer_declined',
  'company_rejected', 'candidate_rejected', 'withdrawn',
  'no_response', 'position_closed'
);

create type public.resume_status as enum (
  'not_submitted', 'submitted', 'submitted_with_cover_letter', 'resume_requested', 'resume_updated_resubmitted'
);

-- Lifecycle (did it happen / get cancelled) — distinct from the existing
-- qualitative `outcome` column (how it felt) and from `round_result` below
-- (pass/fail decision).
create type public.interview_status as enum ('scheduled', 'completed', 'cancelled');

create type public.round_result as enum ('pending', 'passed', 'failed', 'waiting_for_result');

alter table public.applications
  add column location text,
  add column source_name text,
  add column final_outcome public.final_outcome,
  add column resume_status public.resume_status not null default 'not_submitted',
  add column resume_version text,
  add column resume_submitted_date date,
  add column cover_letter_submitted boolean not null default false,
  add column application_url text;

alter table public.interviews
  add column round_number integer not null default 1,
  add column interview_status public.interview_status not null default 'scheduled',
  add column round_result public.round_result not null default 'pending',
  add column prep_notes text;

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  -- Plain text, not an enum: new event kinds shouldn't require a migration
  -- (spec's "don't hard-code the flow" principle applied to the timeline too).
  event_type text not null,
  description text not null,
  metadata jsonb,
  occurred_at timestamptz not null default now()
);

create index application_events_application_id_idx on public.application_events (application_id);
create index application_events_user_id_idx on public.application_events (user_id);

alter table public.application_events enable row level security;

create policy "application_events_select_own" on public.application_events for select using (auth.uid() = user_id);
create policy "application_events_insert_own" on public.application_events for insert with check (auth.uid() = user_id);
create policy "application_events_update_own" on public.application_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "application_events_delete_own" on public.application_events for delete using (auth.uid() = user_id);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  due_date date not null,
  status text not null default 'pending', -- 'pending' | 'completed' | 'skipped'
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index follow_ups_application_id_idx on public.follow_ups (application_id);
create index follow_ups_user_id_idx on public.follow_ups (user_id);

alter table public.follow_ups enable row level security;

create policy "follow_ups_select_own" on public.follow_ups for select using (auth.uid() = user_id);
create policy "follow_ups_insert_own" on public.follow_ups for insert with check (auth.uid() = user_id);
create policy "follow_ups_update_own" on public.follow_ups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "follow_ups_delete_own" on public.follow_ups for delete using (auth.uid() = user_id);
