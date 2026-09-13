-- Phase 7: suggestion engine support. Same flat RLS ownership pattern as prior migrations.

alter table public.profiles add column last_daily_summary_shown_on date;

create table public.suggestion_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Deterministic id produced by the suggestion engine, e.g. 'visa-expiring' or
  -- a date-baked id like 'no-expense-today-2026-09-13' for daily-reset
  -- suggestions, so dismissal naturally expires without a cron job.
  suggestion_id text not null,
  dismissed_at timestamptz not null default now(),
  unique (user_id, suggestion_id)
);

create index suggestion_dismissals_user_id_idx on public.suggestion_dismissals (user_id);

alter table public.suggestion_dismissals enable row level security;

create policy "suggestion_dismissals_select_own" on public.suggestion_dismissals for select using (auth.uid() = user_id);
create policy "suggestion_dismissals_insert_own" on public.suggestion_dismissals for insert with check (auth.uid() = user_id);
create policy "suggestion_dismissals_update_own" on public.suggestion_dismissals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "suggestion_dismissals_delete_own" on public.suggestion_dismissals for delete using (auth.uid() = user_id);
