-- Faixas de Risco Operacional (Configurações Globais) — usadas na Calculadora
-- Inteligente pra aplicar um acréscimo extra sobre o preço de venda sugerido.
create table if not exists public.risk_tiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  extra_margin_percent numeric not null default 0,
  description text,
  created_at timestamptz not null default now()
);

alter table public.risk_tiers enable row level security;

create policy risk_tiers_all_own on public.risk_tiers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Aparência do PDF (Configurações Globais) — aplicada no Orçamento e no
-- Comprovante de Venda. A logo reaproveita profiles.avatar_url (já é a
-- "logo do estúdio" usada nos dois PDFs), sem coluna nova pra isso.
alter table public.settings
  add column if not exists pdf_accent_color text,
  add column if not exists pdf_footer_message text,
  add column if not exists pdf_show_production_deadline boolean not null default true;
