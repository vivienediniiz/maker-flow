-- Texto padrão configurável pelo lojista, exibido na página do produto
-- quando o produto não tem estimated_production_days preenchido (nunca
-- mostra vazio ou "0 dias").
alter table public.store_settings
  add column if not exists default_production_message text;

create or replace view public.store_profiles_public as
  select
    p.id as user_id,
    p.store_slug,
    p.store_headline,
    p.studio_name,
    p.avatar_url,
    p.store_enabled,
    exists (
      select 1 from public.integrations i
      where i.user_id = p.id and i.platform = 'mercado_pago' and i.status = 'connected'
    ) as payment_ready,
    coalesce(ss.logo_url, p.avatar_url) as logo_url,
    ss.primary_color,
    ss.secondary_color,
    ss.title_font,
    ss.whatsapp_number,
    ss.whatsapp_default_message,
    ss.default_production_message
  from public.profiles p
  left join public.store_settings ss on ss.user_id = p.id
  where p.store_enabled = true and p.store_slug is not null;

grant select on public.store_profiles_public to anon, authenticated;
