-- Configurações da Calculadora (tarifa de energia, valor hora, markup
-- padrão) não devem vir pré-preenchidas com um valor genérico pro usuário
-- novo — o app já tratava esses campos como opcionais em vários lugares
-- (ConfigNudgeBanner na Calculadora, checagem "!= null" antes de usar o
-- valor), só os defaults do banco impediam esse estado de acontecer.
alter table public.settings
  alter column electricity_kwh_rate drop not null,
  alter column electricity_kwh_rate drop default,
  alter column hourly_work_rate drop not null,
  alter column hourly_work_rate drop default,
  alter column default_markup drop not null,
  alter column default_markup drop default;
