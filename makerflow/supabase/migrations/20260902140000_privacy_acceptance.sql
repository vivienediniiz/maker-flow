-- Registro separado do aceite da Política de Privacidade
-- Complementa terms_accepted_at para rastreabilidade completa de LGPD

alter table public.profiles
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists privacy_version text;

comment on column public.profiles.privacy_accepted_at is
  'Quando o usuário marcou o aceite à Política de Privacidade no cadastro. Nulo = conta criada antes do consentimento existir.';

comment on column public.profiles.privacy_version is
  'Versão da política aceita (LEGAL_VERSION em lib/legal.ts).';
