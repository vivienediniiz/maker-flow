alter table public.store_checkouts
  add column if not exists payment_provider text not null default 'mercado_pago',
  add column if not exists infinitepay_order_nsu text,
  add column if not exists infinitepay_transaction_nsu text,
  add column if not exists infinitepay_slug text,
  add column if not exists infinitepay_receipt_url text;

alter table public.store_checkouts drop constraint if exists store_checkouts_payment_provider_check;
alter table public.store_checkouts add constraint store_checkouts_payment_provider_check
  check (payment_provider = any (array['mercado_pago', 'infinitepay']));

create unique index if not exists store_checkouts_infinitepay_order_nsu_key
  on public.store_checkouts (infinitepay_order_nsu) where infinitepay_order_nsu is not null;
