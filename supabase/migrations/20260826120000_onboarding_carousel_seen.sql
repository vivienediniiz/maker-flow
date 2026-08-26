alter table public.onboarding_progress
  add column if not exists carousel_seen boolean not null default false;
