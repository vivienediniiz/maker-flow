-- Backstop de limites de plano no banco.
--
-- Até aqui os números de TIER_LIMITS (lib/entitlements.ts) eram aplicados só
-- nos componentes React, então dava pra passar por cima chamando a API do
-- Supabase direto do navegador. Estes triggers repetem os mesmos limites no
-- banco. A aplicação continua sendo a camada que dá a mensagem bonita — aqui
-- é só a rede de segurança.
--
-- IMPORTANTE: só vale para sessões autenticadas do navegador (auth.uid() não
-- nulo). Escritas com a service role passam sem limite de propósito:
--   - lib/mercadoLivre.ts faz upsert em quotes pra ingerir pedido de
--     marketplace. Bloquear ali significaria descartar venda real de um maker
--     que estourou a cota — o pedido existe no Mercado Livre de qualquer jeito.
--   - checkout da loja pública e webhooks seguem o mesmo raciocínio.

-- Espelha TIER_LIMITS. 'Infinity' = sem limite (plano Pro).
create or replace function public.plan_limit(p_tier text, p_resource text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case p_tier
    when 'free' then case p_resource
      when 'clients'        then 15
      when 'products'       then 10
      when 'filaments'      then 5
      when 'branches'       then 1
      when 'printers'       then 1
      when 'quotesPerMonth' then 5
    end
    when 'starter' then case p_resource
      when 'clients'        then 300
      when 'products'       then 150
      when 'filaments'      then 40
      when 'branches'       then 5
      when 'printers'       then 5
      when 'quotesPerMonth' then 50
    end
    else 'Infinity'::numeric
  end;
$$;

create or replace function public.enforce_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource text := tg_argv[0];
  v_tier     text;
  v_limit    numeric;
  v_count    bigint;
  v_start    timestamptz;
begin
  -- Service role / rotina de servidor: sem limite (ver comentário no topo).
  if auth.uid() is null then
    return new;
  end if;

  select subscription_tier into v_tier from public.profiles where id = new.user_id;
  v_tier := coalesce(v_tier, 'free');
  v_limit := public.plan_limit(v_tier, v_resource);

  if v_limit is null or v_limit = 'Infinity'::numeric then
    return new;
  end if;

  if v_resource = 'quotesPerMonth' then
    -- Mesma janela de getMonthlyQuoteCount(): mês corrente no fuso de Brasília,
    -- que é o fuso em que o maker enxerga a própria cota.
    v_start := date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
    select count(*) into v_count
      from public.quotes
     where user_id = new.user_id
       and sent_at >= v_start
       and sent_at <  v_start + interval '1 month';
  else
    execute format('select count(*) from public.%I where user_id = $1', tg_table_name)
      into v_count
      using new.user_id;
  end if;

  if v_count >= v_limit then
    raise exception
      'Limite do plano % atingido: % de % em %', v_tier, v_count, v_limit, v_resource
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_plan_limit_clients        on public.clients;
drop trigger if exists enforce_plan_limit_products       on public.products;
drop trigger if exists enforce_plan_limit_filaments      on public.filaments;
drop trigger if exists enforce_plan_limit_branches       on public.branches;
drop trigger if exists enforce_plan_limit_printer_assets on public.printer_assets;
drop trigger if exists enforce_plan_limit_quotes         on public.quotes;

create trigger enforce_plan_limit_clients
  before insert on public.clients
  for each row execute function public.enforce_plan_limit('clients');

create trigger enforce_plan_limit_products
  before insert on public.products
  for each row execute function public.enforce_plan_limit('products');

create trigger enforce_plan_limit_filaments
  before insert on public.filaments
  for each row execute function public.enforce_plan_limit('filaments');

create trigger enforce_plan_limit_branches
  before insert on public.branches
  for each row execute function public.enforce_plan_limit('branches');

-- O limite "impressoras" da aplicação conta printer_assets, não a tabela printers.
create trigger enforce_plan_limit_printer_assets
  before insert on public.printer_assets
  for each row execute function public.enforce_plan_limit('printers');

create trigger enforce_plan_limit_quotes
  before insert on public.quotes
  for each row execute function public.enforce_plan_limit('quotesPerMonth');
