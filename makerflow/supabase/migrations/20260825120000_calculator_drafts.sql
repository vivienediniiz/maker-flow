create table if not exists public.calculator_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  calc_inputs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calculator_drafts_user_id_idx on public.calculator_drafts (user_id, updated_at desc);

alter table public.calculator_drafts enable row level security;

create policy calculator_drafts_crud_own on public.calculator_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
