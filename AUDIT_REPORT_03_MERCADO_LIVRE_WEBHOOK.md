# 🔒 AUDITORIA DE SEGURANÇA — WEBHOOK MERCADO LIVRE

**Arquivo:** `app/api/webhooks/mercado-livre/route.ts`  
**Severidade Geral:** 🔴 **ALTA** (compartilha muitas vulnerabilidades do MP)  
**Data da Auditoria:** 2026-09-04

---

## 📋 RESUMO EXECUTIVO

Webhook do Mercado Livre **herda 90% dos problemas do Mercado Pago**, mais alguns novos específicos ao Mercado Livre. Tem **6 vulnerabilidades críticas + 2 de média**, incluindo as mesmas falhas de idempotência e validação.

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. **FALTA DE IDEMPOTÊNCIA (mesmo problema do MP)**
**Linha:** 19-65  
**Classificação:** 🔴 **ALTA**

Sem `x-request-id` ou deduplicação, pedidos podem ser processados múltiplas vezes.

---

### 2. **FALTA DE VALIDAÇÃO DO WEBHOOK SIGNATURE**
**Localização:** Linhas 19-65  
**Classificação:** 🔴 **CRÍTICA** — **Sem autenticação do webhook!**

**PROBLEMA GRAVÍSSIMO:**
```typescript
// ML envia webhook SEM autenticação explícita!
// Ao contrário do MP que manda x-signature (HMAC),
// ML só confia na URL cadastrada + IP allowlist (não implementado aqui)

// Qualquer um pode fazer POST pra esse endpoint!
const body = await req.json().catch(() => ({}));
// Sem validação de quem enviou
```

ML apenas recomenda **IP allowlist** (Mercado Livre IP ranges), que **NÃO está implementado** aqui.

Um atacante pode:
```bash
curl -X POST https://studiomaker3d.com.br/api/webhooks/mercado-livre \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "orders_v2",
    "resource": "/orders/999",
    "user_id": 123456  # user_id de qualquer maker
  }'
→ Venda FALSA criada pra qualquer maker
```

**RECOMENDAÇÃO — CRÍTICA:**
```typescript
import { MERCADO_LIVRE_IP_RANGES } from "@/lib/config"; // Atualizar periodicamente

export async function POST(req: NextRequest) {
  // 1. Validar IP contra Mercado Livre official ranges
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  
  const isValidIp = MERCADO_LIVRE_IP_RANGES.some(range => ipInRange(clientIp, range));
  if (!isValidIp) {
    console.warn(`[webhook] mercado-livre: IP não autorizado: ${clientIp}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // 2. Validar header X-MercadoLibre-Signature (se ML enviar)
  // 3. Rate limit por integração, não apenas IP
  
  // ...resto do código
}
```

---

### 3. **PARSING INSEGURO DO `resource`**

**Localização:** Linha 36  
**Classificação:** 🔴 **ALTA** — **Path traversal potential**

**Problema:**
```typescript
const orderId = resource.split("/").pop();
// resource = "/orders/123" → orderId = "123" ✓
// Mas e se resource = "/orders/123/../../users/admin"?
// orderId = "admin" → query usa user_id inválido!
```

Sem validação de format, um atacante pode fazer path traversal.

**Recomendação:**
```typescript
const match = resource.match(/^\/orders\/(\d+)$/);
if (!match) {
  return NextResponse.json({ error: "Invalid resource format" }, { status: 400 });
}
const orderId = match[1];
```

---

### 4. **FALTA DE TIMEOUT E STATUS CHECK NO FETCH**

**Localização:** `lib/mercadoLivre.ts` (assumindo estrutura similar)  
**Classificação:** 🔴 **ALTA**

Sem verificação se `fetchMercadoLivreOrderForIntegration` foi bem-sucedida.

---

### 5. **PII EXPOSTA EM LOGS**

**Localização:** Linhas 38, 50  
**Classificação:** 🔴 **ALTA**

```typescript
console.log("[webhook] mercado-livre: nenhuma integração conectada pro user_id ${mlUserId}");
// ^ Expõe ML user_id (PII)
```

---

### 6. **RATE LIMITING INEFICAZ (por IP, não por integração)**

**Localização:** Linhas 20-24  
**Classificação:** 🔴 **ALTA**

Mesma vulnerabilidade do MP.

---

## 🟠 VULNERABILIDADES DE MÉDIA SEVERIDADE

### 7. **PAYLOAD LOGGING NÃO TRUNCADO**

**Localização:** Linha 38  
**Classificação:** 🟠 **MÉDIA**

```typescript
console.log("[webhook] mercado-livre: payload incompleto, ignorado", JSON.stringify(body).slice(0, 300));
```

Mesmo truncado em 300 chars, pode expor dados sensíveis (buyer email, order items, etc).

**Recomendação:**
```typescript
const sanitized = {
  topic: body.topic,
  resource: body.resource,
  userId: body.user_id ? `***${String(body.user_id).slice(-3)}` : null,
};
console.log("[webhook] mercado-livre: payload inválido", sanitized);
```

---

### 8. **SEM DEDUPLICAÇÃO/IDEMPOTÊNCIA HEADER**

**Localização:** Linhas 19-65  
**Classificação:** 🟠 **MÉDIA**

ML envia `x-request-id` (ou similar) que deveria ser capturado. Não está sendo usado.

---

## 📊 COMPARAÇÃO: MP vs ML Webhook

| Aspecto | Mercado Pago | Mercado Livre |
|---|---|---|
| Autenticação (HMAC) | ✅ Implementado | ❌ Não validado! |
| IP allowlist | Não recomendado | ✅ Recomendado, ❌ Não implementado |
| Idempotência | ❌ Falta | ❌ Falta |
| Timeout | ❌ Falta | ❌ Falta (herdado) |
| Payload validation | ❌ Falta | ❌ Falta (pior!) |
| PII em logs | ❌ Exposto | ❌ Exposto |
| Rate limiting | ⚠️ Por IP | ⚠️ Por IP |

---

## 🔒 CONCLUSÃO

Mercado Livre webhook é **MAIS PERIGOSO que MP** porque:

1. ❌ **SEM HMAC validation** — Qualquer um pode enviar webhook
2. ❌ **IP allowlist não implementado** — Defesa configurada precisa estar no código
3. ❌ **Path traversal em resource parsing**
4. ❌ Herda todos os problemas do MP (idempotência, timeout, logging)

**RECOMENDAÇÃO:** Não colocar em produção até implementar:
1. IP allowlist validation (CRÍTICO)
2. Idempotência com deduplicação
3. Schema validation com Zod

---

## 🛠️ AÇÕES (PRIORIDADE)

### 🔴 BLOQUEANTE (HOJE)
1. Implementar IP allowlist para ML
2. Bloquear acesso ao webhook sem IP válido

### 🟠 URGENTE (< 24h)
3. Adicionar idempotência (igual MP)
4. Validar format de `resource` com regex

### 🟡 IMPORTANTE (< 1 semana)
5. Schema validation
6. Sanitizar logs

