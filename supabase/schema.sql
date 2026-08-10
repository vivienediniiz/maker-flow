-- =========================================================
-- MakerFlow — Supabase Schema
-- Run in order. Assumes `auth.users` (Supabase Auth) exists.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'starter', 'pro', 'studio')),
  billing_cycle text
    check (billing_cycle in ('monthly', 'yearly')),
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'paused', 'cancelled')),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  mp_customer_id text,
  mp_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------------------------------------------------------
-- 2. printers
-- ---------------------------------------------------------
create table if not exists public.printers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  model text,
  watts_power numeric not null default 0,
  cost_per_hour numeric not null default 0,
  status text not null default 'offline'
    check (status in ('idle','printing','paused','error','offline')),
  api_key_webhook text unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.printers enable row level security;

create policy "printers_crud_own" on public.printers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 3. filaments
-- ---------------------------------------------------------
create table if not exists public.filaments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  material text not null,
  color_hex text not null default '#FFFFFF',
  price_per_kg numeric not null default 0,
  remaining_weight_g numeric not null default 1000,
  created_at timestamptz not null default now()
);

alter table public.filaments enable row level security;

create policy "filaments_crud_own" on public.filaments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 4. quotes
-- ---------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  weight_g numeric not null default 0,
  print_time_min numeric not null default 0,
  energy_cost numeric not null default 0,
  filament_cost numeric not null default 0,
  margin_percent numeric not null default 0,
  final_price numeric not null default 0,
  client_id uuid,
  created_at timestamptz not null default now()
);

alter table public.quotes enable row level security;

create policy "quotes_crud_own" on public.quotes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 5. orders
-- ---------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  client_id uuid,
  status_payment text not null default 'pending'
    check (status_payment in ('pending','paid','refunded','failed')),
  status_production text not null default 'queued'
    check (status_production in ('queued','printing','post_processing','ready','shipped')),
  channel text not null default 'site'
    check (channel in ('site','whatsapp','marketplace','presencial')),
  total_value numeric not null default 0,
  deadline date,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_crud_own" on public.orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 6. products
-- ---------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  stock_quantity integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_crud_own" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- 7. settings (1:1 with user)
-- ---------------------------------------------------------
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  electricity_kwh_rate numeric not null default 0.95,
  default_markup numeric not null default 200,
  hourly_work_rate numeric not null default 25,
  marketplace_fees_json jsonb not null default '{}'::jsonb,
  operational_risk_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "settings_crud_own" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Auto-provision profile + settings row on signup
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.settings (user_id) values (new.id);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- Migration log (applied directly on the live project via MCP):
--   2026-08-07  support_three_tier_plans.sql
--   Redesigns subscription_tier to free|starter|pro|studio and adds
--   billing_cycle + subscription_status. This file reflects that end state
--   for anyone provisioning a fresh project from scratch.
-- ---------------------------------------------------------

-- ---------------------------------------------------------
-- Migration log:
--   2026-08-07  add_trial_period.sql
--   Adiciona trial_ends_at (7 dias a partir do signup) em profiles.
-- ---------------------------------------------------------