-- Phase 6: offers. Same flat RLS ownership pattern as prior migrations.

create type public.visa_cost_responsibility as enum ('company', 'employee');
create type public.offer_status as enum ('pending', 'accepted', 'rejected');

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null unique references public.applications (id) on delete cascade,
  salary_aed numeric not null check (salary_aed >= 0),
  bonus_percent numeric,
  leave_days integer,
  visa_sponsorship boolean not null default false,
  visa_cost_responsibility public.visa_cost_responsibility,
  location text,
  growth_rating integer check (growth_rating between 1 and 3),
  status public.offer_status not null default 'pending',
  received_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index offers_application_id_idx on public.offers (application_id);
create index offers_user_id_idx on public.offers (user_id);

alter table public.offers enable row level security;

create policy "offers_select_own" on public.offers for select using (auth.uid() = user_id);
create policy "offers_insert_own" on public.offers for insert with check (auth.uid() = user_id);
create policy "offers_update_own" on public.offers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "offers_delete_own" on public.offers for delete using (auth.uid() = user_id);
