-- Registro do aceite dos Termos de Uso e da Política de Privacidade.
--
-- Até aqui o cadastro não pedia consentimento e não guardava nada. Sem o
-- carimbo de quando e de qual versão foi aceita, não existe prova do aceite —
-- é o registro que vale depois, não o fato de as páginas existirem.
--
-- Perfis criados antes disto ficam com as colunas nulas de propósito: eles
-- realmente nunca aceitaram, e inventar uma data seria pior que não ter.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

comment on column public.profiles.terms_accepted_at is
  'Quando o usuário marcou o aceite no cadastro. Nulo = conta criada antes do consentimento existir.';

comment on column public.profiles.terms_version is
  'Versão dos documentos aceitos (LEGAL_VERSION em lib/legal.ts) — diz a qual texto o usuário disse sim.';

-- O aceite chega em raw_user_meta_data no signup por e-mail/senha, junto com
-- full_name e ref_code. Cadastro por Google não passa por aqui com metadata:
-- esse caminho é carimbado em app/auth/callback/route.ts, depois do round-trip
-- pelo provedor.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
declare
  v_referred_by uuid;
  v_terms_version text := new.raw_user_meta_data->>'terms_version';
begin
  if new.raw_user_meta_data->>'ref_code' is not null then
    select id into v_referred_by
    from public.profiles
    where affiliate_code = new.raw_user_meta_data->>'ref_code'
    limit 1;
  end if;

  insert into public.profiles (
    id, email, full_name, subscription_tier, referred_by, terms_version, terms_accepted_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'pro',
    v_referred_by,
    v_terms_version,
    case when v_terms_version is not null then now() end
  );
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$function$;
