alter table public.quotes drop constraint if exists quotes_payment_method_check;
alter table public.quotes add constraint quotes_payment_method_check
  check (payment_method = any (array['pix', 'credit_card', 'debit_card', 'cash', 'transfer', 'other', 'payment_link']));
