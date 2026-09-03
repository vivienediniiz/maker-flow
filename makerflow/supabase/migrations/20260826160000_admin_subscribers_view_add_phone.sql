-- Ficha do assinante (seção Admin > Assinantes) pede telefone — faltou na
-- primeira versão da view.
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
    phone
  from public.profiles;

grant select on public.admin_subscribers_view to authenticated;
