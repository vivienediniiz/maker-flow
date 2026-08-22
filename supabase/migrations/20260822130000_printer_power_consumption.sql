-- Consumo de energia (W) do controle patrimonial de impressoras, pra
-- Calculadora Inteligente poder puxar a potência automaticamente por mesa.
alter table public.printer_assets
  add column if not exists power_consumption_w numeric;
