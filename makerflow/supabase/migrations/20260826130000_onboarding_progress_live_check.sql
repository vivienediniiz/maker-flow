-- Passos obrigatórios do checklist passam a ser verificados ao vivo contra
-- os dados reais (profiles/settings/printer_assets/filaments), não mais por
-- uma flag que ficava true pra sempre — apagar um cadastro (ex: única
-- impressora) agora faz o passo voltar a aparecer como pendente. Só os 2
-- passos opcionais continuam precisando de uma flag própria, porque "pulado"
-- não é um estado que dá pra derivar dos dados.
alter table public.onboarding_progress
  add column if not exists supplies_skipped boolean not null default false,
  add column if not exists fixed_expenses_skipped boolean not null default false;

alter table public.onboarding_progress
  drop column if exists profile_completed,
  drop column if exists energy_rate_completed,
  drop column if exists labor_rate_completed,
  drop column if exists printer_registered,
  drop column if exists filament_registered,
  drop column if exists supplies_registered,
  drop column if exists fixed_expenses_registered,
  drop column if exists dismissed;
