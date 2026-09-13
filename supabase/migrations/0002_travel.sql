-- Phase 2: flights, visas, accommodations — reuses the flat RLS ownership
-- pattern from 0001_init.sql (user_id default auth.uid(), policy per table).

create type public.flight_direction as enum ('outbound', 'return');
create type public.visa_type as enum ('visit', 'work', 'student');
create type public.visa_status as enum ('pending', 'approved', 'rejected');

create table public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  direction public.flight_direction not null default 'outbound',
  departure_date date not null,
  departure_time time not null,
  airline text not null,
  flight_number text not null,
  cost_aed numeric not null check (cost_aed >= 0),
  seat_number text,
  booking_reference text,
  created_at timestamptz not null default now()
);

create index flights_trip_id_idx on public.flights (trip_id);
create index flights_user_id_idx on public.flights (user_id);

alter table public.flights enable row level security;

create policy "flights_select_own" on public.flights for select using (auth.uid() = user_id);
create policy "flights_insert_own" on public.flights for insert with check (auth.uid() = user_id);
create policy "flights_update_own" on public.flights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flights_delete_own" on public.flights for delete using (auth.uid() = user_id);

create table public.visas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  visa_type public.visa_type not null,
  fee_aed numeric not null check (fee_aed >= 0),
  duration_days integer not null default 60,
  issue_date date not null,
  expiry_date date not null,
  status public.visa_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index visas_trip_id_idx on public.visas (trip_id);
create index visas_user_id_idx on public.visas (user_id);

alter table public.visas enable row level security;

create policy "visas_select_own" on public.visas for select using (auth.uid() = user_id);
create policy "visas_insert_own" on public.visas for insert with check (auth.uid() = user_id);
create policy "visas_update_own" on public.visas for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "visas_delete_own" on public.visas for delete using (auth.uid() = user_id);

create table public.accommodations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  address text not null,
  check_in_date date not null,
  check_out_date date,
  monthly_rent_aed numeric not null check (monthly_rent_aed >= 0),
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create index accommodations_trip_id_idx on public.accommodations (trip_id);
create index accommodations_user_id_idx on public.accommodations (user_id);

alter table public.accommodations enable row level security;

create policy "accommodations_select_own" on public.accommodations for select using (auth.uid() = user_id);
create policy "accommodations_insert_own" on public.accommodations for insert with check (auth.uid() = user_id);
create policy "accommodations_update_own" on public.accommodations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accommodations_delete_own" on public.accommodations for delete using (auth.uid() = user_id);
