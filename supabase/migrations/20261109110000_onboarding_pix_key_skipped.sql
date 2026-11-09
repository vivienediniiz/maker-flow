-- Passo opcional "Cadastrar a Chave Pix da loja" no checklist de início: precisa
-- de uma flag própria de "pulado" (não dá pra derivar isso dos dados).
alter table public.onboarding_progress
  add column if not exists pix_key_skipped boolean not null default false;
