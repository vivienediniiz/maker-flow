-- Histórico de troca de plano/status de assinatura — não existia nenhum
-- registro histórico antes disso, só a "foto do agora" em profiles. Sem
-- isso, o Overview do admin não tem como calcular crescimento/churn
-- mês-a-mês (o número só existe pra frente, a partir de quando essa tabela
-- passa a ser alimentada).
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_tier text,
  from_status text,
  to_tier text not null,
  to_status text not null,
  created_at timestamptz not null default now()
);

alter table public.subscription_events enable row level security;

-- Só admin lê (é dado agregado de negócio, não do próprio usuário).
create policy "subscription_events_admin_select" on public.subscription_events
  for select using (public.is_admin(auth.uid()));

-- Insert própria é necessária pro rebaixamento automático de trial/Pix
-- vencido, que roda como o próprio usuário (app/dashboard/layout.tsx, sem
-- service_role) — o webhook de assinatura usa o client admin e já
-- bypassa RLS.
create policy "subscription_events_self_insert" on public.subscription_events
  for insert with check (auth.uid() = user_id);

-- Admin passa a enxergar profiles inteiro (política adicional, "OR" com a
-- profiles_select_own já existente — mesmo padrão já usado em
-- support_tickets_admin_all).
create policy "profiles_admin_select_all" on public.profiles
  for select using (public.is_admin(auth.uid()));

-- View com security_invoker: roda com o RLS de quem consulta (não do dono
-- da view) — sem isso, uma view comum rodaria com privilégio do criador e
-- vazaria assinatura de todo mundo pra qualquer usuário autenticado. Some
-- os campos de PII pesada (telefone, documento, endereço) que o Overview
-- não precisa.
create or replace view public.admin_subscribers_view
  with (security_invoker = true) as
  select
    id as user_id,
    email,
    full_name,
    studio_name,
    subscription_tier,
    subscription_status,
    billing_cycle,
    payment_method,
    paid_until,
    trial_ends_at,
    first_payment_confirmed_at,
    affiliate_code,
    referred_by,
    created_at
  from public.profiles;

grant select on public.admin_subscribers_view to authenticated;

-- Admin também precisa ver comissão de todo mundo (política adicional,
-- mesmo padrão acima).
create policy "affiliate_commissions_admin_select" on public.affiliate_commissions
  for select using (public.is_admin(auth.uid()));
