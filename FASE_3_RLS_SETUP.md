# Fase 3: Row Level Security (RLS) Setup

## ⚠️ IMPORTANTE
Esta migration **DEVE SER APLICADA** no Supabase para que a segurança Fase 3 entre em vigor.

## Passo 1: Acessar Supabase SQL Editor

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Selecione o projeto **makerflow**
3. Na barra lateral, vá em **SQL Editor**
4. Clique em **New Query**

## Passo 2: Copiar e colar o SQL

Copie TODO o conteúdo do arquivo:
```
supabase/migrations/20260904000000_rls_policies_all_tables.sql
```

Cole no SQL Editor do Supabase e clique em **RUN**.

⚠️ **AVISO:** Essa query pode levar alguns segundos para executar (cria 100+ policies).

## Passo 3: Verificar resultado

Se tudo funcionou, você verá mensagens de sucesso como:
```
ALTER TABLE
CREATE POLICY
CREATE POLICY
...
```

Se houver erro sobre tabelas não existentes, é porque sua versão do banco é diferente. Edite a migration removendo as linhas das tabelas que não existem.

## O que foi implementado?

**Row Level Security (RLS)** garante que:

✅ Usuários só conseguem ver/editar seus PRÓPRIOS dados
✅ Impossível acessar dados de outro usuário via API direct
✅ Ataques de força bruta em IDs alheios não encontram nada
✅ Integração com `auth.uid()` automática no banco

### Tabelas protegidas (21 total):

```
profiles              - perfil do estúdio
quotes               - vendas/pedidos
products             - catálogo de produtos
clients              - clientes cadastrados
filaments            - estoque de filamentos
filament_movements   - histórico de entrada/saída
supplies             - insumos/acessórios
supply_movements     - histórico de insumos
integrations         - conexões Mercado Pago/Livre/etc
printers             - impressoras cadastradas
categories           - categorias de produtos
branches             - filiais/unidades
settings             - configurações da conta
extra_purchases      - despesas avulsas
sales                - histórico de vendas
affiliate_commissions - comissões de afiliados
subscription_events  - histórico de planos
coupon_campaigns     - campanhas de cupons
product_pricing_calculator_inputs - cálculos salvos
```

## Verificação rápida

Para confirmar que RLS está ativo, execute no SQL Editor:

```sql
select 
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public' 
  and rowsecurity = true
order by tablename;
```

Você deve ver as 21 tabelas listadas com `rowsecurity = true`.

## Próximos passos

Após aplicar esta migration:

1. ✅ Fase 1: Fail-closed webhook secrets (DONE)
2. ✅ Fase 2: HMAC validation on webhooks (DONE)
3. ✅ Fase 3: Row Level Security (DONE - após aplicar este SQL)
4. 🔄 Fase 4: (opcional) API Key rotation policy + audit logs

## Rollback (se necessário)

Se precisar reverter, execute:

```sql
alter table profiles disable row level security;
alter table quotes disable row level security;
-- ... etc para todas as tabelas

-- E remova as políticas:
drop policy "Users can view own profile" on profiles;
drop policy "Users can update own profile" on profiles;
-- ... etc
```

Mas **não recomendamos** remover RLS uma vez habilitado - é a proteção mais importante de dados!

---

**Status:** Migration criada e pronta pra aplicar  
**Arquivo:** `supabase/migrations/20260904000000_rls_policies_all_tables.sql`  
**Commit:** `6c9d4ca2`
