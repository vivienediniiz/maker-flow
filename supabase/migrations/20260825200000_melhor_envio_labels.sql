alter table public.profiles
  add column if not exists neighborhood text,
  add column if not exists city text;

alter table public.clients
  add column if not exists document text;

alter table public.quotes
  add column if not exists shipping_label_status text not null default 'nao_iniciado',
  add column if not exists shipping_purchased_cost numeric,
  add column if not exists shipping_purchased_at timestamptz,
  add column if not exists shipping_generated_at timestamptz,
  add column if not exists shipping_printed_at timestamptz,
  add column if not exists shipping_carrier_name text,
  add column if not exists shipping_service_name text;

alter table public.quotes drop constraint if exists quotes_shipping_label_status_check;
alter table public.quotes add constraint quotes_shipping_label_status_check
  check (shipping_label_status in ('nao_iniciado','no_carrinho','comprado','gerado','impresso','cancelado'));
