create table if not exists public.onboarding_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_completed boolean not null default false,
  energy_rate_completed boolean not null default false,
  labor_rate_completed boolean not null default false,
  printer_registered boolean not null default false,
  filament_registered boolean not null default false,
  supplies_registered boolean not null default false,
  fixed_expenses_registered boolean not null default false,
  dismissed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.onboarding_progress enable row level security;

drop policy if exists "onboarding_progress_select_own" on public.onboarding_progress;
create policy "onboarding_progress_select_own" on public.onboarding_progress
  for select using (auth.uid() = user_id);

drop policy if exists "onboarding_progress_insert_own" on public.onboarding_progress;
create policy "onboarding_progress_insert_own" on public.onboarding_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "onboarding_progress_update_own" on public.onboarding_progress;
create policy "onboarding_progress_update_own" on public.onboarding_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_onboarding_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_onboarding_progress_updated_at on public.onboarding_progress;
create trigger set_onboarding_progress_updated_at
  before update on public.onboarding_progress
  for each row execute function public.touch_onboarding_progress_updated_at();
