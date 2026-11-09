-- Loja Online: Pix direto na chave do lojista (com desconto %) + entrega
-- configurável + dados de entrega/desconto no checkout.
--
-- A chave Pix NÃO entra na view pública: só o servidor (service_role) a lê pra
-- gerar o QR Code. A view expõe apenas se o Pix está configurado.

alter table public.store_settings
  add column if not exists pix_key text,
  add column if not exists pix_holder_name text,
  add column if not exists pix_city text,
  add column if not exists pix_discount_percent numeric not null default 0,
  add column if not exists pickup_enabled boolean not null default false,
  add column if not exists pickup_address text,
  add column if not exists arrange_enabled boolean not null default false,
  add column if not exists arrange_note text,
  add column if not exists shipping_options jsonb not null default '[]'::jsonb;

alter table public.store_settings drop constraint if exists store_settings_pix_discount_check;
alter table public.store_settings add constraint store_settings_pix_discount_check
  check (pix_discount_percent >= 0 and pix_discount_percent <= 50);

alter table public.store_checkouts
  add column if not exists pix_payload text,
  add column if not exists delivery_method text,
  add column if not exists delivery_label text,
  add column if not exists shipping_amount numeric not null default 0,
  add column if not exists discount_amount numeric not null default 0;

alter table public.store_checkouts drop constraint if exists store_checkouts_payment_provider_check;
alter table public.store_checkouts add constraint store_checkouts_payment_provider_check
  check (payment_provider = any (array['mercado_pago', 'infinitepay', 'pix_direto']));

create or replace view public.store_profiles_public as
  select
    p.id as user_id,
    p.store_slug,
    p.store_headline,
    p.studio_name,
    p.avatar_url,
    p.store_enabled,
    (
      exists (
        select 1 from public.integrations i
        where i.user_id = p.id and i.platform = 'mercado_pago' and i.status = 'connected'
      )
      or (ss.pix_key is not null and ss.pix_key <> '')
    ) as payment_ready,
    coalesce(ss.logo_url, p.avatar_url) as logo_url,
    ss.primary_color,
    ss.secondary_color,
    ss.title_font,
    ss.whatsapp_number,
    ss.whatsapp_default_message,
    ss.default_production_message,
    ss.title_color,
    ss.subtitle_font,
    exists (
      select 1 from public.integrations i
      where i.user_id = p.id and i.platform = 'mercado_pago' and i.status = 'connected'
    ) as mp_ready,
    (ss.pix_key is not null and ss.pix_key <> '') as pix_ready,
    coalesce(ss.pix_discount_percent, 0) as pix_discount_percent,
    coalesce(ss.pickup_enabled, false) as pickup_enabled,
    ss.pickup_address,
    coalesce(ss.arrange_enabled, false) as arrange_enabled,
    ss.arrange_note,
    coalesce(ss.shipping_options, '[]'::jsonb) as shipping_options
  from public.profiles p
  left join public.store_settings ss on ss.user_id = p.id
  where p.store_enabled = true and p.store_slug is not null;

grant select on public.store_profiles_public to anon, authenticated;
