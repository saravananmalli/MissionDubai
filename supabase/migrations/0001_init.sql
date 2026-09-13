-- Phase 0: profiles + trips, and the RLS pattern every later migration repeats.
--
-- Ownership pattern used across the entire schema: every domain table carries
-- its own `user_id uuid not null default auth.uid() references auth.users(id)`,
-- with a policy restricting all CRUD to `auth.uid() = user_id`. This is applied
-- flat on every table (including "child" tables that also have a parent FK)
-- rather than checked via multi-hop joins, so there is only one ownership rule
-- to get right, and it can't be bypassed by a spoofed value: DEFAULT stamps it
-- server-side and WITH CHECK rejects anything else.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create type public.trip_status as enum ('planning', 'active', 'completed');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  start_date date not null,
  target_end_date date,
  status public.trip_status not null default 'planning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_user_id_idx on public.trips (user_id);

alter table public.trips enable row level security;

create policy "trips_select_own" on public.trips
  for select using (auth.uid() = user_id);
create policy "trips_insert_own" on public.trips
  for insert with check (auth.uid() = user_id);
create policy "trips_update_own" on public.trips
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trips_delete_own" on public.trips
  for delete using (auth.uid() = user_id);
