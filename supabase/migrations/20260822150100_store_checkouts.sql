-- Snapshot de um checkout da loja: criado ANTES de redirecionar o comprador
-- pro Mercado Pago, lido de volta pelo webhook (via external_reference) quando
-- o pagamento confirma. Nunca acessado por RLS de usuário/anon — só service_role
-- (checkout API e webhook usam o client admin), então RLS fica ligado sem
-- nenhuma policy.
create table if not exists public.store_checkouts (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  mp_preference_id text,
  status text not null default 'pending', -- pending | paid | expired
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  buyer_cep text,
  buyer_street text,
  buyer_number text,
  buyer_complement text,
  buyer_neighborhood text,
  buyer_city text,
  buyer_state text,
  items jsonb not null, -- [{ product_id, name, unit_price, quantity }]
  total_amount numeric not null,
  created_at timestamptz not null default now()
);

alter table public.store_checkouts enable row level security;
