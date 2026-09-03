alter table public.quotes
  add column if not exists shipping_weight_g numeric,
  add column if not exists shipping_height_cm numeric,
  add column if not exists shipping_width_cm numeric,
  add column if not exists shipping_length_cm numeric;
