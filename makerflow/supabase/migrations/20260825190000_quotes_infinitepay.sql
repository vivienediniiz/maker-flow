alter table public.quotes
  add column if not exists infinitepay_order_nsu text,
  add column if not exists infinitepay_transaction_nsu text;

alter table public.quotes drop constraint if exists quotes_payment_method_check;
alter table public.quotes add constraint quotes_payment_method_check
  check (payment_method = any (array['pix', 'credit_card', 'debit_card', 'cash', 'transfer', 'other', 'payment_link', 'infinitepay']));

create unique index if not exists quotes_infinitepay_order_nsu_key
  on public.quotes (infinitepay_order_nsu) where infinitepay_order_nsu is not null;
