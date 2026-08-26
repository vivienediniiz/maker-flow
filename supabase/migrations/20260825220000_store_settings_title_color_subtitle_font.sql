-- Ajuste de paleta/tipografia da Loja Online: 3 cores (destaque, fundo,
-- texto/títulos) e 2 fontes curadas (título e subtítulo), conforme pedido.
alter table public.store_settings
  add column if not exists title_color text,
  add column if not exists subtitle_font text;

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
    ss.default_production_message,
    ss.title_color,
    ss.subtitle_font
  from public.profiles p
  left join public.store_settings ss on ss.user_id = p.id
  where p.store_enabled = true and p.store_slug is not null;

grant select on public.store_profiles_public to anon, authenticated;
