# Baseline do banco

Como levantar um projeto Supabase novo — de teste, ou pra recuperar produção.

## Por que isto existe

O banco de produção tem **71 migrations aplicadas**. `supabase/migrations/` tem
**31 arquivos**, e o mais antigo é de 12/08 — as 17 primeiras, que criam o
schema inteiro, foram aplicadas direto no projeto ao vivo e nunca viraram
arquivo. O `supabase/schema.sql` é um retrato parcial e velho (ainda descreve os
planos como `free|monthly|quarterly`, abandonados em 27/08).

Ou seja: **até aqui, o repositório não conseguia reconstruir o banco.** Este
diretório fecha esse buraco.

## Arquivos

| Arquivo | De onde vem | O que tem |
|---|---|---|
| `01_schema.sql` | gerado por `supabase db dump` | schema `public` inteiro: tabelas, colunas, constraints, índices, funções, RLS |
| `02_storage_and_auth.sql` | escrito à mão, versionado | o que o dump não leva: trigger em `auth.users`, buckets e policies de storage |

`01_schema.sql` não está versionado porque é gerado — regere quando o schema
mudar. Se preferir versionar, tire a linha do `.gitignore`.

## Gerar o `01_schema.sql`

```bash
npx supabase login
npx supabase db dump --project-ref dgcdltcpvnultwduypcu -f supabase/baseline/01_schema.sql
```

O segundo comando pede a senha do banco (Supabase → Settings → Database). Ela é
digitada no prompt, não vai pra linha de comando nem pro histórico do shell.

## Provisionar um projeto novo

Na ordem, no SQL Editor do projeto novo (ou via `psql`):

1. `01_schema.sql`
2. `02_storage_and_auth.sql`

Depois, confira que o trigger pegou — é a falha mais silenciosa possível:

```sql
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- tem que devolver: on_auth_user_created
```

Sem esse trigger o cadastro cria o usuário no Auth e **nunca** cria a linha em
`profiles`. O app assume que o perfil existe, então o projeto parece saudável
até o primeiro cadastro.

## Fora do banco

Nem tudo é SQL. Ao subir um projeto novo, confira também no painel:

- **Auth → Providers**: Google OAuth (client id/secret) e a URL de callback
- **Auth → URL Configuration**: Site URL e Redirect URLs
- **Auth**: confirmação de e-mail ligada ou desligada — muda o fluxo de cadastro
- **Vault**: as credenciais de integração (`integration_vault_functions`) são
  dados, não schema; um projeto novo sobe sem nenhuma
