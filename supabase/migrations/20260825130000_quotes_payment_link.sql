alter table public.quotes
  add column if not exists payment_link_url text,
  add column if not exists mp_preference_id text;
