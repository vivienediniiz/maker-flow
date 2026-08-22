-- Seleção/ordem de produtos na loja
alter table public.products
  add column if not exists in_store boolean not null default false,
  add column if not exists store_display_order integer;

-- Configuração da loja (1:1 com o usuário, junto do que profiles já guarda)
alter table public.profiles
  add column if not exists store_enabled boolean not null default false,
  add column if not exists store_slug text unique,
  add column if not exists store_headline text;

-- Agrupa quotes geradas por um mesmo checkout da loja (referência leve, sem FK
-- obrigatória pra não travar caso o checkout seja limpo no futuro)
alter table public.quotes
  add column if not exists storefront_checkout_id uuid;

-- Novo valor de origem: venda feita pela loja online do próprio maker
alter table public.quotes
  drop constraint if exists quotes_source_check;
alter table public.quotes
  add constraint quotes_source_check
  check (source in ('mercado_pago', 'mercado_livre', 'shopee', 'tiktok_shop', 'manual', 'loja_online'));

-- Views públicas: só essas colunas ficam visíveis pra visitante sem login,
-- nunca a linha inteira de products/profiles (evita vazar custo, estoque,
-- telefone, documento etc).
create or replace view public.store_products_public as
  select id, user_id, name, description, image_url, sale_price, store_display_order
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
    ) as payment_ready
  from public.profiles p
  where p.store_enabled = true and p.store_slug is not null;

grant select on public.store_products_public to anon, authenticated;
grant select on public.store_profiles_public to anon, authenticated;
