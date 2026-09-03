alter table public.quotes
  add column if not exists production_start_date date;
