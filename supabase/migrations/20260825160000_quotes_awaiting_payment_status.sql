alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes add constraint quotes_status_check
  check (status = any (array['sent', 'awaiting_payment', 'paid', 'in_production', 'shipped', 'expired', 'cancelled']));
