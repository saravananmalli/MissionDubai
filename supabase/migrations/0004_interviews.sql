-- Phase 4: interviews. Same flat RLS ownership pattern as prior migrations.

create type public.interview_type as enum ('phone', 'video', 'in_person');
create type public.interview_outcome as enum ('pending', 'very_good', 'good', 'ok', 'bad');

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  interview_date date not null,
  interview_time time not null,
  type public.interview_type not null,
  interviewer_name text,
  interviewer_role text,
  meeting_link text,
  reminder_24h boolean not null default true,
  reminder_1h boolean not null default true,
  reminder_15min boolean not null default false,
  reminder_daily_until boolean not null default false,
  outcome public.interview_outcome not null default 'pending',
  confidence_rating integer check (confidence_rating between 1 and 10),
  feedback_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_application_id_idx on public.interviews (application_id);
create index interviews_user_id_idx on public.interviews (user_id);

alter table public.interviews enable row level security;

create policy "interviews_select_own" on public.interviews for select using (auth.uid() = user_id);
create policy "interviews_insert_own" on public.interviews for insert with check (auth.uid() = user_id);
create policy "interviews_update_own" on public.interviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "interviews_delete_own" on public.interviews for delete using (auth.uid() = user_id);
