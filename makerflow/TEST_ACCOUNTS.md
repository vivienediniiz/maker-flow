# Contas de Teste - StudioMaker

## 📧 Contas de Teste

### FREE PLAN
**Email:** `rodrigomes.rga@gmail.com`  
**Status:** Trial → Converter para Free  
**Ação:** Ver SQL abaixo para forçar downgrade

### STARTER PLAN
**Email:** (criar novo email)  
**Status:** Novo  
**Ação:** Criar conta e fazer subscription no Starter

### PRO PLAN
**Email:** (você já tem)  
**Status:** Ativo  
**Ação:** Usar conta existente

## 🎯 Casos de Uso

### ✅ Use este email para:

1. **Testar Limitações do Plano Grátis**
   - Máximo 5 orçamentos/mês
   - Até 15 clientes
   - Até 10 produtos
   - Até 5 filamentos
   - 1 impressora
   - 1 filial

2. **Testar Feature Gating**
   - Componentes `FeatureGate` bloqueados
   - Mensagens de upgrade
   - Botões de CTA direcionando para planos

3. **Testar Fluxo de Upgrade**
   - Ir de Free → Starter
   - Ir de Free → Pro
   - Testar pagamento (teste mode Mercado Pago)

4. **Testar Funcionalidades Públicas**
   - Landing page (`/`)
   - Pricing (`/pricing`)
   - FAQ/Help

### ❌ NÃO use para:

- Dados sensíveis reais
- Vendas reais
- Dados de clientes reais
- Integração com sistema real

## ⚙️ Setup das Contas

### 1️⃣ Forçar downgrade: Trial → Free

Para converter `rodrigomes.rga@gmail.com` de trial para Free **agora** (sem esperar 14 dias):

**No Supabase SQL Editor:**

```sql
-- Encontrar o user_id do email
SELECT id, email, subscription_tier, subscription_status, trial_ends_at 
FROM auth.users 
WHERE email = 'rodrigomes.rga@gmail.com';

-- Atualizar para Free (substitua {user_id} pelo ID acima)
UPDATE profiles 
SET 
  subscription_tier = 'free',
  subscription_status = 'inactive',
  trial_ends_at = NOW()
WHERE user_id = '{user_id}';
```

Depois disso:
- Logout e login novamente
- Verá plano Free com limitações
- Feature Gating aparecerá nos blocos

### 2️⃣ Criar conta Starter

**Via UI:**
1. Ir em `/signup`
2. Digitar novo email (ex: `teste-starter@gmail.com`)
3. Criar conta (receberá trial de 14 dias)
4. Ir em `/dashboard/subscription`
5. Clicar "Assine Starter"
6. Fazer pagamento (usar cartão de teste: 4111 1111 1111 1111)

**Via Supabase (rápido):**

```sql
-- Assumindo que a conta foi criada, atualize para Starter ativo
UPDATE profiles 
SET 
  subscription_tier = 'starter',
  subscription_status = 'active',
  trial_ends_at = NULL
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'teste-starter@gmail.com'
);
```

### 3️⃣ Usar conta Pro existente

Apenas faça login com suas credenciais. Nada a fazer aqui! ✅

## 💻 Como Usar em Testes

### Playwright E2E Tests

```typescript
// tests/e2e/free-plan.spec.ts
import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'rodrigomes.rga@gmail.com';

test('verificar limitações do plano grátis', async ({ page }) => {
  await page.goto('https://maker-flow.netlify.app');
  
  // Login
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
  
  // Verificar que não pode criar mais de 5 orçamentos
  // ...
});
```

### Manual Testing

1. Abrir em navegador anônimo (incógnito)
2. Ir em `/login`
3. Digitar `rodrigomes.rga@gmail.com`
4. Fazer login
5. Navegar pelo dashboard
6. Tentar acessar features bloqueadas

## 🔄 Resetar Dados de Teste

Se precisar resetar a conta para estado limpo:

```sql
-- No Supabase SQL Editor
DELETE FROM quotes WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rodrigomes.rga@gmail.com');
DELETE FROM products WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rodrigomes.rga@gmail.com');
DELETE FROM clients WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rodrigomes.rga@gmail.com');
-- ... etc para outras tabelas
```

## 📝 Checklist de Testes Comuns

- [ ] **Signup** - Criar conta nova com este email
- [ ] **Feature Gating** - Verificar que Financeiro está bloqueado
- [ ] **Upgrade CTA** - Clicar em "Ver Planos" funciona
- [ ] **Limit Enforcement** - Não conseguir criar 6º orçamento
- [ ] **Trial Period** - Ver countdown de 14 dias
- [ ] **Downgrade** - Trial expirar → volta pra Free
- [ ] **Integrações** - Verificar que Mercado Pago está bloqueado

## 🚀 Adicionar Mais Emails de Teste

Editar `.env.test`:

```env
TEST_EMAIL_STARTER=seu-email-starter@gmail.com
TEST_EMAIL_PRO=seu-email-pro@gmail.com
```

E criar as contas correspondentes com os planos pagos.

## 📞 Referência Rápida

| Email | Plano | Status | Ação |
|-------|-------|--------|------|
| rodrigomes.rga@gmail.com | Free | Trial ✅ | Forçar downgrade com SQL |
| teste-starter@gmail.com | Starter | Criar | Signup + subscription |
| (seu email) | Pro | Ativo | Usar existente |

### Quick Commands

**Forçar Free:**
```sql
UPDATE profiles SET subscription_tier = 'free', subscription_status = 'inactive', trial_ends_at = NOW() WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rodrigomes.rga@gmail.com');
```

**Criar Starter:**
```sql
UPDATE profiles SET subscription_tier = 'starter', subscription_status = 'active', trial_ends_at = NULL WHERE user_id = (SELECT id FROM auth.users WHERE email = 'teste-starter@gmail.com');
```

---

**Última atualização:** 2026-09-03
