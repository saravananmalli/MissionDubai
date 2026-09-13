-- Phase 3: applications, company_visits, visit_photos + visit-photos storage
-- bucket. Same flat RLS ownership pattern as prior migrations, applied even
-- to child tables (company_visits, visit_photos) rather than checked via
-- multi-hop joins up to applications.

create type public.application_source as enum ('linkedin', 'job_board', 'company_site', 'referral', 'other');
create type public.application_status as enum ('applied', 'shortlisted', 'interviewing', 'offer', 'rejected', 'withdrawn');
create type public.salary_status as enum ('provided', 'will_update_later');
create type public.visa_sponsorship_status as enum ('yes', 'no', 'unsure', 'need_to_ask');
create type public.visit_purpose as enum ('interview', 'office_tour', 'meeting', 'recruiting_fair', 'other');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  company_name text not null,
  position_title text not null,
  source public.application_source not null,
  status public.application_status not null default 'applied',
  applied_date date not null default current_date,
  salary_min_aed numeric,
  salary_max_aed numeric,
  salary_status public.salary_status not null default 'will_update_later',
  visa_sponsorship public.visa_sponsorship_status not null default 'need_to_ask',
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_trip_id_idx on public.applications (trip_id);
create index applications_user_id_idx on public.applications (user_id);
-- "One company = one record": a plain table-level UNIQUE constraint can't
-- reference an expression like lower(company_name), only a unique index can.
create unique index applications_user_trip_company_unique_idx
  on public.applications (user_id, trip_id, lower(company_name));

alter table public.applications enable row level security;

create policy "applications_select_own" on public.applications for select using (auth.uid() = user_id);
create policy "applications_insert_own" on public.applications for insert with check (auth.uid() = user_id);
create policy "applications_update_own" on public.applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "applications_delete_own" on public.applications for delete using (auth.uid() = user_id);

create table public.company_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  visit_date date not null,
  visit_time time not null,
  purpose public.visit_purpose not null,
  notes text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create index company_visits_application_id_idx on public.company_visits (application_id);
create index company_visits_user_id_idx on public.company_visits (user_id);

alter table public.company_visits enable row level security;

create policy "company_visits_select_own" on public.company_visits for select using (auth.uid() = user_id);
create policy "company_visits_insert_own" on public.company_visits for insert with check (auth.uid() = user_id);
create policy "company_visits_update_own" on public.company_visits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "company_visits_delete_own" on public.company_visits for delete using (auth.uid() = user_id);

create table public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  visit_id uuid not null references public.company_visits (id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index visit_photos_visit_id_idx on public.visit_photos (visit_id);
create index visit_photos_user_id_idx on public.visit_photos (user_id);

alter table public.visit_photos enable row level security;

create policy "visit_photos_select_own" on public.visit_photos for select using (auth.uid() = user_id);
create policy "visit_photos_insert_own" on public.visit_photos for insert with check (auth.uid() = user_id);
create policy "visit_photos_update_own" on public.visit_photos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "visit_photos_delete_own" on public.visit_photos for delete using (auth.uid() = user_id);

-- Storage: private bucket for visit photos, path convention
-- {user_id}/{application_id}/{visit_id}/{uuid}.jpg — ownership keyed on the
-- first path segment, same mental model as the table-level RLS above.
insert into storage.buckets (id, name, public) values ('visit-photos', 'visit-photos', false)
  on conflict (id) do nothing;

create policy "visit_photos_storage_select_own" on storage.objects
  for select using (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "visit_photos_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "visit_photos_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = auth.uid()::text);
