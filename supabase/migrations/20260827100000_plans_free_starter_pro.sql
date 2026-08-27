-- Migração de planos: free/monthly/quarterly -> free/starter/pro,
-- billing_cycle: monthly/quarterly -> monthly/annual.
-- Confirmado ao vivo antes de aplicar: só 2 profiles existem (1 free, 1
-- monthly sem mp_customer_id/mp_subscription_id reais — conta da própria
-- usuária, sem assinatura de verdade no Mercado Pago), e nenhuma outra
-- constraint/view no banco referencia monthly/quarterly.

alter table public.profiles drop constraint if exists profiles_subscription_tier_check;
alter table public.profiles drop constraint if exists profiles_billing_cycle_check;

update public.profiles
set subscription_tier = 'pro', billing_cycle = null
where subscription_tier in ('monthly', 'quarterly');

alter table public.profiles add constraint profiles_subscription_tier_check
  check (subscription_tier = any (array['free'::text, 'starter'::text, 'pro'::text]));

alter table public.profiles add constraint profiles_billing_cycle_check
  check (billing_cycle = any (array['monthly'::text, 'annual'::text]));

-- Reverse trial passa a dar acesso Pro completo (era 'monthly').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_referred_by uuid;
begin
  if new.raw_user_meta_data->>'ref_code' is not null then
    select id into v_referred_by
    from public.profiles
    where affiliate_code = new.raw_user_meta_data->>'ref_code'
    limit 1;
  end if;

  insert into public.profiles (id, email, full_name, subscription_tier, referred_by)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'pro', v_referred_by);
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$function$;
