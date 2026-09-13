-- Phase 5: budgets, expenses. Same flat RLS ownership pattern as prior
-- migrations. Simplified from the original plan sketch: one budget per trip
-- (not month-partitioned) — the doc's own example is a single flat trip
-- budget, and a ~60-day personal trip doesn't need monthly budget rollover.
-- Alert thresholds (80/90/100%) are fixed in app code, not configurable per
-- row, since nothing in the product doc asks the user to configure them.

create type public.expense_category as enum
  ('meals', 'transport', 'clothes', 'shopping', 'activities', 'pg_rent', 'flight', 'visa', 'other');
create type public.payment_method as enum ('cash', 'card', 'other');

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  amount_aed numeric not null check (amount_aed >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id)
);

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets for delete using (auth.uid() = user_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  category public.expense_category not null,
  amount_aed numeric not null check (amount_aed >= 0),
  expense_date date not null,
  description text,
  receipt_photo_path text,
  location text,
  payment_method public.payment_method,
  created_at timestamptz not null default now()
);

create index expenses_trip_id_idx on public.expenses (trip_id);
create index expenses_user_id_idx on public.expenses (user_id);

alter table public.expenses enable row level security;

create policy "expenses_select_own" on public.expenses for select using (auth.uid() = user_id);
create policy "expenses_insert_own" on public.expenses for insert with check (auth.uid() = user_id);
create policy "expenses_update_own" on public.expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_delete_own" on public.expenses for delete using (auth.uid() = user_id);

-- Storage: private bucket for receipt photos, path convention
-- {user_id}/{expense_id}/{uuid}.jpg — same ownership model as visit-photos.
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

create policy "receipts_storage_select_own" on storage.objects
  for select using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts_storage_insert_own" on storage.objects
  for insert with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts_storage_delete_own" on storage.objects
  for delete using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
