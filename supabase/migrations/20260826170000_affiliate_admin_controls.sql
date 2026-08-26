-- Controles de afiliado que o admin passa a poder configurar: desativar um
-- afiliado (só sinalização — não bloqueia comissão retroativa), % de
-- comissão customizado por afiliado (sobrepõe AFFILIATE_COMMISSION_RATE
-- global quando preenchido), e chave PIX pra onde a comissão é paga
-- manualmente (o pagamento em si continua fora do app).
alter table public.profiles
  add column if not exists affiliate_active boolean not null default true,
  add column if not exists affiliate_commission_rate numeric,
  add column if not exists affiliate_pix_key text;

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
    created_at,
    phone,
    affiliate_active,
    affiliate_commission_rate,
    affiliate_pix_key
  from public.profiles;

grant select on public.admin_subscribers_view to authenticated;

-- Admin precisa gravar affiliate_active/affiliate_commission_rate/
-- affiliate_pix_key em linhas de OUTROS usuários — profiles_update_own só
-- cobre a própria linha. Mesmo padrão "for all" já usado em
-- support_tickets_admin_all (confiança total pra quem já passou pelo gate
-- de is_admin, aplicado na UI só nos campos de afiliado).
create policy "profiles_admin_update_all" on public.profiles
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Admin precisa marcar comissão de qualquer afiliado como paga.
create policy "affiliate_commissions_admin_update" on public.affiliate_commissions
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
