# Contas de Teste - StudioMaker

## 📧 Email de Teste Principal

**Email:** `rodrigomes.rga@gmail.com`  
**Plano:** Grátis  
**Status:** Ativo para testes

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

## 🔐 Credenciais

**Email:** rodrigomes.rga@gmail.com  
**Senha:** (configurar na primeira sessão)

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

| Email | Plano | Uso |
|-------|-------|-----|
| rodrigomes.rga@gmail.com | Grátis | Testar limitações + feature gating |
| (vazio) | Starter | Próximo a adicionar |
| (vazio) | Pro | Próximo a adicionar |

---

**Última atualização:** 2026-09-03
