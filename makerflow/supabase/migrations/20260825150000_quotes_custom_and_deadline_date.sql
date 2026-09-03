alter table public.quotes
  add column if not exists is_custom boolean not null default false,
  add column if not exists customization_notes text,
  add column if not exists production_deadline_date date;
