# 🔒 AUDITORIA DE SEGURANÇA — WEBHOOK MERCADO PAGO

**Arquivo:** `app/api/webhooks/mercado-pago/route.ts`  
**Severidade Geral:** 🟠 **ALTA** (múltiplas vulnerabilidades críticas)  
**Data da Auditoria:** 2026-09-04  
**Analisador:** Engenheiro de Segurança Senior

---

## 📋 RESUMO EXECUTIVO

O webhook de pagamentos do Mercado Pago apresenta **5 vulnerabilidades críticas** e **3 de média severidade** que comprometem a integridade financeira da plataforma. Os problemas incluem:

1. ❌ **Falta de validação de idempotência** (permite processar mesmo pedido múltiplas vezes)
2. ❌ **Falta de verificação do status HTTP** (ignora erros de fetch silenciosamente)
3. ❌ **Informações sensíveis em logs** (chaves, user_ids sem sanitização)
4. ❌ **Rate limiting ineficaz** (sem per-maker limits, apenas por IP)
5. ❌ **Falta de timeout em fetch** (pode travar indefinidamente)

---

## 🔴 VULNERABILIDADES CRÍTICAS (ALTA SEVERIDADE)

### 1. **FALTA DE IDEMPOTÊNCIA — Processamento Duplicado de Pedidos**

**Localização:** Linhas 22-96 (`route.ts`)  
**Classificação:** 🔴 **ALTA** — **Risco Financeiro**

**Problema:**
```typescript
// Não há verificação de idempotência!
// Se o Mercado Pago reenviar o webhook 3x, cada venda é criada 3x
const order = await fetchMercadoPagoOrderForIntegration(admin, integration, String(resourceId));
await upsertQuoteFromMercadoPagoOrder(admin, integration.user_id, order); // Upsert sem idemkey
```

O webhook **não usa `x-request-id` para idempotência**. Se Mercado Pago reenviar a mesma notificação (algo comum em APIs de pagamento), a venda será processada múltiplas vezes.

**Cenário de Ataque/Falha:**
- MP envia webhook de pedido pago → Venda #1 criada ✅
- Rede falha, MP não recebe 200 OK → Retenta em 5 min
- Webhook recebido novamente → Venda #2 criada (DUPLICADA) 🚨
- Mesmo pedido aparece 2-3x no seu sistema
- Financeiro fica inconsistente (lucro contabilizado 2x)

**Recomendação:**
Implementar idempotência usando `x-request-id`:

```typescript
// Verificar se já processamos esse request_id
const xRequestId = req.headers.get("x-request-id");
if (!xRequestId) {
  return NextResponse.json({ error: "Missing x-request-id" }, { status: 400 });
}

const { data: existingEvent } = await admin
  .from("webhook_events")
  .select("id")
  .eq("provider", "mercado_pago")
  .eq("request_id", xRequestId)
  .maybeSingle();

if (existingEvent) {
  return NextResponse.json({ ok: true, cached: "already processed" });
}

// ... processar ...

// Guardar na tabela webhook_events pra evitar duplicação
await admin.from("webhook_events").insert({
  provider: "mercado_pago",
  request_id: xRequestId,
  processed_at: new Date().toISOString(),
});
```

---

### 2. **FALTA DE VALIDAÇÃO DE STATUS HTTP DO FETCH**

**Localização:** Linha 87 (`lib/mercadoPago.ts`, função `fetchMercadoPagoOrderForIntegration`)  
**Classificação:** 🔴 **ALTA** — **Data Corruption**

**Problema:**
```typescript
// Não há verificação se o fetch foi bem-sucedido!
const order = await fetchMercadoPagoOrderForIntegration(admin, integration, String(resourceId));
```

Se a API do Mercado Pago retornar erro (500, 503, 401, etc.), o código trata `null` como order válida.

**Cenário de Falha:**
- MP API retorna 500 (erro temporário)
- `fetchMercadoPagoOrderForIntegration` retorna `null` ou dados incompletos
- `upsertQuoteFromMercadoPagoOrder` cria venda com dados `null`
- Venda fica "meia criada" no banco (sem preço, sem pagador, etc.)
- Financeiro fica quebrado

**Recomendação:**
Adicionar validação explícita:

```typescript
try {
  const order = await fetchMercadoPagoOrderForIntegration(admin, integration, String(resourceId));
  
  if (!order) {
    console.error(`[webhook] mercado-pago: fetchMercadoPagoOrderForIntegration retornou null para ${resourceId}`);
    return NextResponse.json({ error: "Failed to fetch order from Mercado Pago" }, { status: 502 });
  }
  
  // Validar campos obrigatórios
  if (!order.id || !order.total_amount) {
    return NextResponse.json({ error: "Order missing critical fields" }, { status: 400 });
  }
  
  await upsertQuoteFromMercadoPagoOrder(admin, integration.user_id, order);
} catch (err) {
  // ...
}
```

---

### 3. **FALTA DE TIMEOUT NO FETCH PARA MERCADO PAGO**

**Localização:** `lib/mercadoPago.ts`, funções `exchangeMercadoPagoCode`, `refreshMercadoPagoTokens`  
**Classificação:** 🔴 **ALTA** — **Denial of Service interno**

**Problema:**
```typescript
const res = await fetch("https://api.mercadopago.com/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({...}),
});
// Sem timeout! Node.js aguarda indefinidamente
```

Se Mercado Pago ficar lento ou a rede cair, o webhook **trava o process do Next.js** por minutos.

**Recomendação:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

try {
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    signal: controller.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...}),
  });
  clearTimeout(timeout);
  // ...
} catch (err) {
  if (err.name === 'AbortError') {
    throw new Error("Mercado Pago timeout após 5s");
  }
  throw err;
}
```

---

### 4. **EXPOSIÇÃO DE DADOS SENSÍVEIS EM LOGS**

**Localização:** Linhas 44, 58, 76 (`route.ts`)  
**Classificação:** 🔴 **ALTA** — **Information Disclosure**

**Problema:**
```typescript
console.log(`[webhook] mercado-pago: nenhuma integração conectada pro user_id ${mpUserId}`);
// ^ Logs públicos expõem `user_id` do Mercado Pago (PII)

console.error(
  `[webhook] mercado-pago: ASSINATURA INVÁLIDA pro pedido ${resourceId} (conta MP ${mpUserId}, integração ${integration.id})`
);
// ^ Expõe IDs de integração + usuário
```

Esses logs podem ser vistos por:
- Terceiros com acesso a logs (Netlify dashboard, Sentry, etc.)
- Logs não criptografados sendo armazenados
- Vazamento acidental em relatórios de erro

**Recomendação:**
```typescript
// Logar apenas IDs hasheados ou genéricos
const userIdHash = crypto.createHash('sha256').update(String(mpUserId)).digest('hex').slice(0, 8);

console.log(`[webhook] mercado-pago: integração não encontrada [user:${userIdHash}]`);

console.error(
  `[webhook] mercado-pago: ASSINATURA INVÁLIDA para pedido ${resourceId} [integration:${integration.id}]`
);
```

---

### 5. **RATE LIMITING INEFICAZ — SEM LIMITE POR MAKER**

**Localização:** Linhas 24-30 (`route.ts`)  
**Classificação:** 🔴 **ALTA** — **DoS / Abuse**

**Problema:**
```typescript
const { success } = await webhookRateLimit.limit(ip);
// Limita por IP, não por integração/maker
// Um maker malicioso pode:
// 1. Usar múltiplos IPs (proxies, VPNs)
// 2. Ou fazer 1000 requests do mesmo IP (um único maker gasta limite de todos)
```

**Cenário:**
- Maker A inicia 1000 requisições falsas do IP 1.2.3.4
- Rate limit bloqueia 1.2.3.4
- Maker B (legítimo) também está em 1.2.3.4 (mesma rede, proxy, etc.)
- Maker B fica sem poder receber webhooks 🚨

**Recomendação:**
```typescript
// Rate limit por integração, não apenas por IP
const integrationId = integration?.id;
if (!integrationId) {
  return NextResponse.json({ error: "Integration not found" }, { status: 400 });
}

const { success } = await webhookRateLimit.limit(`${integrationId}:${ip}`);
// Agora limita por integração + IP
// Evita que um maker prejudique outro
```

---

## 🟠 VULNERABILIDADES DE MÉDIA SEVERIDADE

### 6. **SQL INJECTION POTENCIAL (Parsing de x-signature)**

**Localização:** Linha 575 (`lib/mercadoPago.ts`)  
**Classificação:** 🟠 **MÉDIA**

**Problema:**
```typescript
const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId ?? ""};ts:${ts};`;
// dataId e xRequestId vêm diretamente do header, sem sanitização
// Se parsed em query SQL depois, risco de injection
```

Enquanto a função `validateMercadoPagoSignature` em si não executa SQL, o `dataId` é passado adiante e pode ser usado inseguramente em queries.

**Recomendação:**
```typescript
// Validar format antes de usar
if (!/^\d+$/.test(params.dataId)) {
  return false; // dataId deve ser apenas números
}
```

---

### 7. **FALTA DE VALIDAÇÃO DO PAYLOAD SCHEMA**

**Localização:** Linhas 34-37 (`route.ts`)  
**Classificação:** 🟠 **MÉDIA**

**Problema:**
```typescript
const body = await req.json().catch(() => ({}));
const type = body.type ?? req.nextUrl.searchParams.get("type");
// Sem schema validation! Um payload malformado é aceito silenciosamente
```

**Recomendação:**
Use `zod` ou `joi` para validar:

```typescript
import { z } from "zod";

const WebhookPayloadSchema = z.object({
  type: z.enum(["order", "payment"]),
  user_id: z.number().positive(),
  data: z.object({
    id: z.string().regex(/^\d+$/),
  }),
});

const parsed = WebhookPayloadSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
}
```

---

### 8. **CREDENCIAIS NÃO ESTÃO USANDO RATE LIMITING PARA OAUTH**

**Localização:** `lib/mercadoPago.ts`, linhas 67-92  
**Classificação:** 🟠 **MÉDIA** — **Brute Force Risk**

**Problema:**
```typescript
export async function exchangeMercadoPagoCode(code: string, redirectUri: string): Promise<MpOAuthTokens> {
  // Sem rate limiting!
  // Um atacante pode tentar múltiplos codes para descobrir autorization codes válidos
```

**Recomendação:**
```typescript
// Adicionar rate limiting por code/redirectUri
const { success } = await authCodeRateLimit.limit(`${code}:${redirectUri}`);
if (!success) {
  throw new Error("Too many auth code exchanges");
}
```

---

## ✅ PONTOS POSITIVOS (Segurança Implementada Corretamente)

1. ✅ **HMAC-SHA256 com timing-safe comparison** (linha 581) — Excelente prática!
2. ✅ **Service role key bem isolado** (linha 8) — Credenciais de admin não vazadas
3. ✅ **Roteamento por user_id** — Cada maker só vê seus próprios webhooks
4. ✅ **Tratamento de erro genérico** (linha 78) — Não expõe detalhes de erro
5. ✅ **Supabase Vault para credenciais** — Tokens OAuth armazenados com segurança

---

## 📊 MATRIZ DE RISCO

| Vulnerabilidade | Severidade | Impacto | Exploração | CVSS |
|---|---|---|---|---|
| Falta de Idempotência | 🔴 ALTA | Vendas duplicadas, perda financeira | Trivial (retransmissão MP) | 7.5 |
| Status HTTP não validado | 🔴 ALTA | Dados corrompidos no banco | Médio (falha API MP) | 6.5 |
| Timeout não implementado | 🔴 ALTA | DoS interno do app | Médio (rede lenta) | 5.9 |
| Exposição de PII em logs | 🔴 ALTA | Vazamento de dados | Fácil (acesso a logs) | 7.1 |
| Rate limit por IP | 🔴 ALTA | DoS entre makers | Médio (múltiplos IPs) | 6.2 |
| SQL Injection potencial | 🟠 MÉDIA | Acesso ao banco | Difícil (encoding corrigido) | 4.3 |
| Sem validação de schema | 🟠 MÉDIA | Processamento incorreto | Fácil (payload malformado) | 4.7 |
| Sem rate limit OAuth | 🟠 MÉDIA | Brute force de codes | Médio (N codes possíveis) | 3.9 |

---

## 🛠️ PLANO DE AÇÃO (PRIORIDADE)

### 🔴 IMEDIATO (< 24h)
1. Implementar idempotência com `x-request-id`
2. Adicionar validação de status HTTP
3. Sanitizar logs (remover PII)

### 🟠 URGENTE (< 1 semana)
4. Implementar timeout nos fetches
5. Melhorar rate limiting (por integração, não só IP)
6. Adicionar schema validation com Zod

### 🟡 IMPORTANTE (< 2 semanas)
7. Rate limiting para OAuth code exchange
8. Monitoramento e alertas de webhooks falhados
9. Testes de resiliência com retry

---

## 📝 PRÓXIMOS ARQUIVOS PARA AUDITORIA

**Selecionados para análise incremental:**

2. **Auth & Middleware** → `app/api/auth/callback/route.ts`
3. **Webhook Mercado Livre** → `app/api/webhooks/mercado-livre/route.ts`
4. **Supabase RLS Policies** → Check constraints em `quotes`
5. **Integrações OAuth** → `lib/mercadoLivre.ts`, `lib/shopee.ts`

---

## 🔒 CONCLUSÃO

O webhook Mercado Pago está **operacional mas não pronto para produção**. As vulnerabilidades encontradas podem resultar em:
- ❌ Perda financeira (vendas duplicadas)
- ❌ Inconsistência de dados (pedidos corrompidos)
- ❌ Vazamento de informações sensíveis
- ❌ Indisponibilidade (DoS interno)

Recomenda-se **resolver todas as 5 vulnerabilidades críticas antes do lançamento**.

---

**Assinado:** Engenheiro de Segurança  
**Data:** 2026-09-04  
**Próxima revisão:** Após implementação das correções
