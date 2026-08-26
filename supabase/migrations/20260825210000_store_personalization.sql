-- Personalização da Loja Online: identidade visual, banners, categoria (já
-- existe em products.category, texto livre — não duplicada aqui), prazo de
-- produção e campo de personalização por produto.

-- ---------------------------------------------------------
-- store_settings — identidade visual + WhatsApp da loja, 1:1 com o usuário.
-- ---------------------------------------------------------
create table if not exists public.store_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  logo_url text,
  primary_color text,
  secondary_color text,
  title_font text,
  whatsapp_number text,
  whatsapp_default_message text,
  updated_at timestamptz not null default now()
);

alter table public.store_settings enable row level security;

create policy "store_settings_crud_own" on public.store_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- store_banners — slideshow do topo da loja, múltiplos por usuário.
-- ---------------------------------------------------------
create table if not exists public.store_banners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  title text,
  subtitle text,
  target_link text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.store_banners enable row level security;

create policy "store_banners_crud_own" on public.store_banners
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Prazo de produção estimado + personalização, configurados por produto
-- (nem todo produto é personalizável, e o rótulo do campo varia por produto).
-- ---------------------------------------------------------
alter table public.products
  add column if not exists estimated_production_days integer,
  add column if not exists allows_customization boolean not null default false,
  add column if not exists customization_label text;

-- ---------------------------------------------------------
-- Views públicas — reexpõe só o necessário pra renderizar a loja, nunca a
-- linha inteira (mesmo padrão já usado por store_products_public /
-- store_profiles_public, criadas em 20260822150000).
-- ---------------------------------------------------------
create or replace view public.store_products_public as
  select
    id, user_id, name, description, image_url, sale_price, store_display_order,
    category, estimated_production_days, allows_customization, customization_label
  from public.products
  where in_store = true;

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
    ss.whatsapp_default_message
  from public.profiles p
  left join public.store_settings ss on ss.user_id = p.id
  where p.store_enabled = true and p.store_slug is not null;

create or replace view public.store_banners_public as
  select id, user_id, image_url, title, subtitle, target_link, display_order
  from public.store_banners
  where active = true
  order by display_order asc;

grant select on public.store_products_public to anon, authenticated;
grant select on public.store_profiles_public to anon, authenticated;
grant select on public.store_banners_public to anon, authenticated;
