# 🚨 AUDITORIA DE SEGURANÇA — SUPABASE RLS (CRÍTICA!)

**Contexto:** Supabase Row Level Security para `quotes`, `integrations`, `profiles`  
**Severidade Geral:** 🔴 **CRÍTICA** — **Isolamento de dados quebrado**  
**Data da Auditoria:** 2026-09-04

---

## ⚠️ DESCOBERTA CRÍTICA

**RLS FOI ATIVADO MAS AS POLICIES NÃO FORAM CRIADAS!**

```sql
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
-- ✅ RLS enabled
-- ❌ MAS NENHUMA CREATE POLICY foi criada!
```

**O que isso significa?**

Com RLS ativado e **SEM políticas**, Supabase vai:
1. **Bloquear TODOS os acessos** (nem select, nem insert funciona)
2. **OU** está usando `service_role` pra tudo (bypassa RLS)
3. **OU** queries estão falhando silenciosamente

---

## 🔴 VULNERABILIDADE #1 — RLS INCOMPLETO

**Severidade:** 🔴 **CRÍTICA**  
**Arquivo:** `supabase/migrations/20260903_add_soft_delete_quotes.sql` (Linha 37)

**Problema:**
```sql
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
-- Nenhuma CREATE POLICY depois disso!
```

**Impacto:**

Se aplicativo tenta acessar `quotes` com **client auth** (não service_role):
```typescript
const { data } = await supabase  // Client auth
  .from("quotes")
  .select("*");
// → ERRO: new row violates row-level security policy
```

**Cenário de Falha:**
1. Maker faz login
2. Dashboard tenta carregar vendas
3. Query falha (RLS rejeita, sem policy)
4. Dashboard quebra 🚨

**SE estão usando `service_role` pra tudo:**
```typescript
const admin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY);
await admin.from("quotes").select("*"); // Bypassa RLS!
```

Então RLS é **inútil** — um dev com acesso ao code consegue ler tudo.

---

## 🔴 VULNERABILIDADE #2 — FALTA DE ISOLAMENTO POR USER_ID

**Severidade:** 🔴 **CRÍTICA**  
**Risco:** **Data breach — Makers veem vendas uns dos outros**

**Problema:**

Mesmo que as políticas fossem criadas, elas provavelmente **não isolam por `user_id`**:

```sql
-- Seria necessário ter algo como:
CREATE POLICY "quotes_own" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

-- Mas isso NÃO foi criado!
```

Sem essa policy:
- Maker A faz login
- Query `SELECT * FROM quotes` sem WHERE
- Pega TODAS as vendas de TODOS os makers 🚨

---

## 🔴 VULNERABILIDADE #3 — FALTA DE POLICIES EM INTEGRATIONS

**Severidade:** 🔴 **CRÍTICA**  
**Risco:** **Credenciais de OAuth vazadas**

A tabela `integrations` armazena:
- `platform_account_id` (ID do Mercado Pago, Mercado Livre)
- `credential_secret_id` (referência ao Supabase Vault)
- `status`
- `user_id`

**Se RLS não está configurado:**
```typescript
const { data: allIntegrations } = await supabase
  .from("integrations")
  .select("*");
// → Retorna TODAS as integrações de TODOS os makers
// → Um maker consegue fazer queries na conta de outro!
```

---

## 🔴 VULNERABILIDADE #4 — FALTA DE POLICIES EM PROFILES

**Severidade:** 🔴 **CRÍTICA**  
**Risco:** **Vazamento de informações pessoais**

`profiles` contém:
- `email`
- `phone`
- `address`
- `subscription_tier`
- `payment_method`
- `document` (CPF/CNPJ)

Sem RLS:
```typescript
const { data: allUsers } = await supabase
  .from("profiles")
  .select("email, phone, subscription_tier");
// → CSV com dados de TODOS os makers!
```

---

## 📊 MATRIZ DE IMPACTO

| Tabela | Dados Expostos | Risco | Impacto |
|---|---|---|---|
| `quotes` | Todas as vendas | Breakdown de negócio | Alto (vendas vazadas) |
| `integrations` | OAuth credentials | Token hijacking | Crítico ($ em risco) |
| `profiles` | PII (email, CPF) | LGPD violation | Crítico (legal) |
| `clients` | Clientes de outros makers | Competitive harm | Médio |
| `filaments` | Estoque, fornecedores | Copycats | Médio |

---

## 🛠️ COMO CORRIGIR

### OPÇÃO A: Usar `service_role` para tudo (menos seguro)

```typescript
// Continuar como está — RLS "enabled" mas inútil
// RLS ativa o bloqueio, mas service_role bypassa
// = falsa sensação de segurança
```

**Problema:** Se código vazar, alguém pode ler tudo.

### OPÇÃO B: Criar policies corretas (recomendado)

```sql
-- 1. QUOTES: cada maker vê só suas próprias vendas
CREATE POLICY "quotes_own" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "quotes_insert_own" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. INTEGRATIONS: cada maker vê só suas integrações
CREATE POLICY "integrations_own" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

-- 3. PROFILES: cada maker vê só seu próprio perfil
CREATE POLICY "profiles_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE WITH CHECK (auth.uid() = id);

-- 4. ADMIN bypass (pra dashboard)
CREATE POLICY "admin_all" ON quotes
  FOR SELECT USING (public.is_admin(auth.uid()));
```

**Passo-a-passo:**
1. Criar arquivo `supabase/migrations/20260904_create_rls_policies.sql`
2. Adicionar todas as CREATE POLICY acima
3. Testar com client auth (não service_role)
4. Remover `service_role` de queries normais

---

## 🔍 COMO VERIFICAR SE RLS ESTÁ FUNCIONANDO

```typescript
// Test 1: Logar como Maker A
const supabaseA = createClient(URL, anon);
await supabaseA.auth.signInWithPassword({email: "maker-a@..."});

// Test 2: Tentar ler quotes
const { data: quotesA } = await supabaseA
  .from("quotes")
  .select("*");
// Deve retornar APENAS vendas de Maker A ✅

// Test 3: Tentar injetar SQL (should be blocked by RLS)
const { data: quotesAll } = await supabaseA
  .from("quotes")
  .select("*")
  .or("user_id.neq." + makerId); // tentativa de injection
// Deve retornar [] (vazio) — RLS bloqueia ✅

// Test 4: Service role deve ver tudo
const admin = createAdminClient(URL, SERVICE_ROLE);
const { data: allQuotes } = await admin
  .from("quotes")
  .select("*");
// Deve retornar todas as vendas (bypass)
```

---

## 📋 CHECKLIST DE CORREÇÃO

- [ ] Criar file `supabase/migrations/20260904_create_rls_policies.sql`
- [ ] Definir policies para `quotes` (select, insert, update, delete)
- [ ] Definir policies para `integrations` (select only)
- [ ] Definir policies para `profiles` (select own, update own)
- [ ] Definir policies para `filaments` (select own, update own)
- [ ] Definir policies para admin bypass (is_admin check)
- [ ] Testar com client auth (não service_role)
- [ ] Verificar que queries normais usam client, não service_role
- [ ] Run migration em staging environment primeiro
- [ ] Test in production (com maker de teste)
- [ ] Monitor logs pra "permission denied" errors

---

## 🚨 RISCO IMEDIATO

**Estado atual:**
- ❌ RLS enabled MAS sem policies
- ❌ Provavelmente usando service_role pra tudo
- ❌ = Nenhuma isolamento real

**Cenário de ataque:**
1. Dev code commit vaza (GitHub breach, ex-employee)
2. Attacker vê `SUPABASE_SERVICE_ROLE_KEY` no código
3. Attacker pode ler TODAS as vendas, clientes, credenciais
4. 🚨 Breach: dados de 100+ makers expostos

---

## ✅ RECOMENDAÇÕES

### 🔴 BLOQUEANTE
1. Implementar RLS policies (hoje)
2. Testar isolamento (hoje)
3. Migrar queries pra client auth onde possível

### 🟠 URGENTE (< 1 semana)
4. Audit todas as queries — quais usam `service_role`?
5. Remover `service_role` de queries normais
6. Adicionar tests pra verificar RLS funciona

### 🟡 IMPORTANTE (< 1 mês)
7. Document RLS policies em README
8. Train team em Row Level Security
9. Add RLS policy review ao code review

---

## 🔒 CONCLUSÃO

**RLS está quebrado.** Enquanto não houver policies criadas:
- ❌ Isolamento de dados: FALHO
- ❌ Multi-tenancy: NÃO FUNCIONA
- ❌ Compliance (LGPD): VIOLADO

**Não está pronto pra produção.**

Prioridade: **MÁXIMA**. Corrigir antes de qualquer maker real acessar.

