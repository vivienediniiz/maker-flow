# 🔧 SECURITY FIXES — CÓDIGO PRONTO PARA COPIAR/COLAR

**Data:** 2026-09-04  
**Total de Fixes:** 15 (11 críticas + 4 médias)  
**Tempo estimado:** ~2-3 horas pra aplicar tudo

---

## 📋 ÍNDICE

1. [Mercado Pago Webhook](#1-mercado-pago-webhook)
2. [Auth Callback](#2-auth-callback)
3. [Mercado Livre Webhook](#3-mercado-livre-webhook)
4. [Supabase RLS Policies](#4-supabase-rls)

---

---

# 1. MERCADO PAGO WEBHOOK

## FIX #1.1 — IDEMPOTÊNCIA (Prevent duplicate sales)

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `lib/mercadoPago.ts` (adicionar função)  
**Tempo:** 15 min

### ANTES:
```typescript
// Sem idempotência — pedido pode processar múltiplas vezes
export async function upsertQuoteFromMercadoPagoOrder(admin, userId, order) {
  // ... processa venda ...
}
```

### DEPOIS:
```typescript
/**
 * Tabela de deduplicação de webhooks.
 * Cria com: supabase migration, ou run direto no SQL Editor:
 * 
 * CREATE TABLE webhook_events (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   provider TEXT NOT NULL,
 *   request_id TEXT NOT NULL,
 *   processed_at TIMESTAMP DEFAULT now(),
 *   UNIQUE(provider, request_id)
 * );
 * 
 * CREATE INDEX idx_webhook_events_provider_req ON webhook_events(provider, request_id);
 */

export async function isWebhookProcessed(
  admin: SupabaseClient,
  provider: string,
  requestId: string
): Promise<boolean> {
  const { data } = await admin
    .from("webhook_events")
    .select("id")
    .eq("provider", provider)
    .eq("request_id", requestId)
    .maybeSingle();
  
  return !!data;
}

export async function markWebhookProcessed(
  admin: SupabaseClient,
  provider: string,
  requestId: string
): Promise<void> {
  await admin.from("webhook_events").insert({
    provider,
    request_id: requestId,
    processed_at: new Date().toISOString(),
  });
}
```

### APLICAR NO WEBHOOK:

**Em `app/api/webhooks/mercado-pago/route.ts`:**

```typescript
export async function POST(req: NextRequest) {
  // Rate limiting
  if (webhookRateLimit) {
    const ip = requestIp(req);
    const { success } = await webhookRateLimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const admin = adminClient();
  const xRequestId = req.headers.get("x-request-id");

  // ✅ NOVO: Validar se já processamos esse request
  if (!xRequestId) {
    return NextResponse.json({ error: "Missing x-request-id" }, { status: 400 });
  }

  const alreadyProcessed = await isWebhookProcessed(admin, "mercado_pago", xRequestId);
  if (alreadyProcessed) {
    console.log(`[webhook] mercado-pago: request ${xRequestId} já processado, retornando cached`);
    return NextResponse.json({ ok: true, cached: true });
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type ?? req.nextUrl.searchParams.get("type");
  const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("data.id");
  const mpUserId = body.user_id;

  if (type !== "order" || !resourceId) {
    return NextResponse.json({ ok: true, skipped: "not an order event" });
  }

  if (!mpUserId) {
    console.log("[webhook] mercado-pago: evento sem user_id no payload, ignorado");
    return NextResponse.json({ ok: true, skipped: "no user_id in payload" });
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, user_id, status, credential_secret_id")
    .eq("platform", "mercado_pago")
    .eq("platform_account_id", String(mpUserId))
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    console.log(`[webhook] mercado-pago: nenhuma integração conectada [user:${mpUserId}]`);
    return NextResponse.json({ ok: true, skipped: "no connected integration for this account" });
  }

  const webhookSecret = process.env.MERCADO_PAGO_VENDAS_WEBHOOK_SECRET;
  if (webhookSecret) {
    const validSignature = validateMercadoPagoSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: String(resourceId),
      secret: webhookSecret,
    });
    if (!validSignature) {
      console.error(
        `[webhook] mercado-pago: ASSINATURA INVÁLIDA pro pedido ${resourceId} (integração ${integration.id}) — venda DESCARTADA.`
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn(
      "[webhook] mercado-pago: MERCADO_PAGO_VENDAS_WEBHOOK_SECRET ausente — processando sem validar assinatura."
    );
  }

  try {
    // ✅ NOVO: Validar se order retornou corretamente
    const order = await fetchMercadoPagoOrderForIntegration(admin, integration, String(resourceId));
    
    if (!order) {
      console.error(`[webhook] mercado-pago: fetchMercadoPagoOrderForIntegration retornou null para ${resourceId}`);
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 502 });
    }

    if (!order.id || !order.total_amount) {
      console.error(`[webhook] mercado-pago: order com campos obrigatórios ausentes: ${JSON.stringify(order).slice(0, 200)}`);
      return NextResponse.json({ error: "Order missing critical fields" }, { status: 400 });
    }

    await upsertQuoteFromMercadoPagoOrder(admin, integration.user_id, order);
    
    // ✅ NOVO: Marcar webhook como processado
    await markWebhookProcessed(admin, "mercado_pago", xRequestId);
  } catch (err) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return apiError("webhook:mercado-pago", err, "Falha ao processar notificação.", 500);
  }

  await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);

  return NextResponse.json({ ok: true });
}
```

---

## FIX #1.2 — TIMEOUT NOS FETCHES

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `lib/mercadoPago.ts`  
**Tempo:** 10 min

### ANTES:
```typescript
export async function exchangeMercadoPagoCode(code: string, redirectUri: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = mpOAuthCredentials();

  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...}),
  });
  // Sem timeout! Pode travar indefinidamente
}
```

### DEPOIS:
```typescript
const FETCH_TIMEOUT_MS = 5000; // 5 segundos

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal })
    .then(res => {
      clearTimeout(timeout);
      return res;
    })
    .catch(err => {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`Request timeout after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw err;
    });
}

export async function exchangeMercadoPagoCode(code: string, redirectUri: string): Promise<MpOAuthTokens> {
  const { clientId, clientSecret } = mpOAuthCredentials();

  try {
    const res = await fetchWithTimeout("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    
    if (!res.ok) {
      throw new Error(`Mercado Pago respondeu ${res.status} ao trocar código`);
    }
    
    const data = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user_id,
      public_key: data.public_key,
      expires_in: data.expires_in,
      obtained_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[mercadoPago] exchangeCode failed", {
      error: err instanceof Error ? err.message : String(err),
      code: code.slice(0, 5) + "...",
    });
    throw err;
  }
}

// Aplicar mesmo padrão a: refreshMercadoPagoTokens, fetchMercadoPagoOrderForIntegration
```

---

## FIX #1.3 — SANITIZAR LOGS (Remove PII)

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `app/api/webhooks/mercado-pago/route.ts`  
**Tempo:** 5 min

### ANTES:
```typescript
console.log(`[webhook] mercado-pago: nenhuma integração conectada pro user_id ${mpUserId}`);
// Expõe user_id real
```

### DEPOIS:
```typescript
// Criar helper pra hash IDs de forma consistente
function sanitizeUserId(userId: string | number): string {
  const hash = crypto.createHash("sha256").update(String(userId)).digest("hex");
  return `***${hash.slice(-6)}`; // Últimas 6 chars do hash
}

// Usar em todos os logs:
console.log(`[webhook] mercado-pago: nenhuma integração conectada [user:${sanitizeUserId(mpUserId)}]`);

console.error(
  `[webhook] mercado-pago: ASSINATURA INVÁLIDA pro pedido ${resourceId} [integration:${integration.id}]`
  // Não expor user_id, só integration.id
);
```

---

## FIX #1.4 — RATE LIMITING POR INTEGRAÇÃO

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `app/api/webhooks/mercado-pago/route.ts`  
**Tempo:** 10 min

### ANTES:
```typescript
const ip = requestIp(req);
const { success } = await webhookRateLimit.limit(ip);
// Limita apenas por IP — todos na mesma rede compartilham limite
```

### DEPOIS:
```typescript
// Rate limit por integração + IP (evita uma integração prejudicar outra)
const limitKey = `mp-webhook:${integration?.id || 'unknown'}:${ip}`;
const { success } = await webhookRateLimit.limit(limitKey);

if (!success) {
  console.warn(`[webhook] mercado-pago: rate limit exceeded [key:${limitKey}]`);
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}
```

---

## FIX #1.5 — SCHEMA VALIDATION

**Severidade:** 🟠 MÉDIA  
**Arquivo:** `lib/mercadoPago.ts` (adicionar no topo)  
**Tempo:** 15 min

### CÓDIGO:
```typescript
import { z } from "zod";

const MercadoPagoWebhookSchema = z.object({
  type: z.enum(["order", "payment"]),
  user_id: z.number().positive("user_id deve ser positivo"),
  data: z.object({
    id: z.string().regex(/^\d+$/, "data.id deve ser numérico"),
  }),
});

// Usar no webhook:
export async function POST(req: NextRequest) {
  // ... rate limiting ...

  const body = await req.json().catch(() => ({}));
  
  // ✅ NOVO: Validar schema
  const parseResult = MercadoPagoWebhookSchema.safeParse(body);
  if (!parseResult.success) {
    console.warn("[webhook] mercado-pago: payload inválido", {
      errors: parseResult.error.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { type, user_id, data } = parseResult.data;
  const resourceId = data.id;
  const mpUserId = user_id;

  // ... resto do código ...
}
```

---

---

# 2. AUTH CALLBACK

## FIX #2.1 — VALIDAR SITE_URL CONTRA ALLOWLIST

**Severidade:** 🟠 MÉDIA  
**Arquivo:** `app/auth/callback/route.ts`  
**Tempo:** 5 min

### ANTES:
```typescript
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";
// Sem validação!
```

### DEPOIS:
```typescript
const ALLOWED_REDIRECT_SITES = [
  "https://studiomaker3d.com.br",
  "https://maker-flow.netlify.app",
  "http://localhost:3000", // dev
];

function validateSiteUrl(url: string): string {
  if (!ALLOWED_REDIRECT_SITES.includes(url)) {
    console.error(`[auth/callback] SITE_URL inválida: ${url}`);
    return "https://studiomaker3d.com.br"; // Fallback seguro
  }
  return url;
}

const SITE_URL = validateSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br"
);
```

---

## FIX #2.2 — REMOVER PII DE ERRO NA URL

**Severidade:** 🟠 MÉDIA  
**Arquivo:** `app/auth/callback/route.ts`  
**Tempo:** 5 min

### ANTES:
```typescript
if (error) {
  return NextResponse.redirect(
    `${SITE_URL}/login?oauth_error=${encodeURIComponent(error.message)}`
  );
  // Expõe mensagem de erro
}
```

### DEPOIS:
```typescript
if (error) {
  // Log interno (seguro)
  console.error("[auth/callback] OAuth error", {
    status: error.status,
    message: error.message,
    timestamp: new Date().toISOString(),
  });

  // Mensagem genérica pro user
  return NextResponse.redirect(`${SITE_URL}/login?error=auth_failed`);
}
```

---

## FIX #2.3 — VALIDAR REF CODE

**Severidade:** 🟠 MÉDIA  
**Arquivo:** `app/auth/callback/route.ts`  
**Tempo:** 5 min

### ANTES:
```typescript
const refCode = req.nextUrl.searchParams.get("ref");
// Sem validação de formato
```

### DEPOIS:
```typescript
const refCode = req.nextUrl.searchParams.get("ref");

// Validar format (ajuste regex conforme seu scheme de affiliate code)
const isValidRefCode = refCode ? /^[a-zA-Z0-9-_]{6,32}$/.test(refCode) : true;

if (refCode && !isValidRefCode) {
  console.warn(`[auth/callback] Invalid ref format: ${refCode}`);
  // Continua sem ref (não falha o login)
}

if (refCode && isValidRefCode) {
  try {
    const { data: affiliateId } = await supabase.rpc("resolve_affiliate_code", { code: refCode });
    if (affiliateId && affiliateId !== user.id) {
      await supabase.from("profiles").update({ referred_by: affiliateId }).eq("id", user.id);
    }
  } catch (err) {
    console.error("[auth/callback] affiliate resolution failed", {
      code: refCode,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
```

---

---

# 3. MERCADO LIVRE WEBHOOK

## FIX #3.1 — IP ALLOWLIST PARA MERCADO LIVRE

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `app/api/webhooks/mercado-livre/route.ts`  
**Tempo:** 20 min

### CÓDIGO:
```typescript
// Adicionar no topo do arquivo
import { NextRequest, NextResponse } from "next/server";

// IP ranges oficiais do Mercado Livre (atualizar periodicamente!)
// Fonte: https://developers.mercadolibre.com.ar/en/guides/webhooks
const MERCADO_LIVRE_IP_RANGES = [
  "200.57.149.192/26",   // Example - VERIFICAR DOCUMENTAÇÃO OFICIAL
  "200.57.149.128/26",
  // ... adicionar todos os ranges oficiais
];

function ipInRange(ip: string, cidr: string): boolean {
  const [network, prefix] = cidr.split("/");
  const prefixLen = parseInt(prefix, 10);

  // Converter IPs pra inteiros
  const ipParts = ip.split(".").map(Number);
  const networkParts = network.split(".").map(Number);

  const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const networkInt = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];

  const mask = (0xffffffff << (32 - prefixLen)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function isValidMercadoLivreIP(ip: string | null): boolean {
  if (!ip) return false;
  
  // Remover x-forwarded-for chain, pegar primeiro IP
  const clientIp = ip.split(",")[0].trim();
  
  return MERCADO_LIVRE_IP_RANGES.some(range => ipInRange(clientIp, range));
}

export async function POST(req: NextRequest) {
  // ✅ NOVO: Validar IP
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  
  if (!isValidMercadoLivreIP(clientIp)) {
    console.warn(`[webhook] mercado-livre: IP não autorizado: ${clientIp}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limiting (continua como antes)
  if (webhookRateLimit) {
    const ip = requestIp(req);
    const { success } = await webhookRateLimit.limit(ip);
    if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ... resto do código ...
}
```

---

## FIX #3.2 — VALIDAR RESOURCE FORMAT

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `app/api/webhooks/mercado-livre/route.ts`  
**Tempo:** 5 min

### ANTES:
```typescript
const orderId = resource.split("/").pop();
// Sem validação — path traversal possível
```

### DEPOIS:
```typescript
// Validar format: /orders/123
const resourceMatch = resource.match(/^\/orders\/(\d+)$/);
if (!resourceMatch) {
  console.warn(`[webhook] mercado-livre: invalid resource format: ${resource}`);
  return NextResponse.json({ error: "Invalid resource format" }, { status: 400 });
}

const orderId = resourceMatch[1]; // Garantido ser numérico
```

---

## FIX #3.3 — IDEMPOTÊNCIA (igual Mercado Pago)

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `app/api/webhooks/mercado-livre/route.ts`  
**Tempo:** 10 min

Aplicar o mesmo padrão de FIX #1.1:
- Adicionar check de `webhook_events` no início
- Marcar como processado ao final
- Retornar `{ ok: true, cached: true }` se já processado

---

## FIX #3.4 — SANITIZAR LOGS

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `app/api/webhooks/mercado-livre/route.ts`  
**Tempo:** 5 min

Aplicar o mesmo padrão de FIX #1.3:
- Usar `sanitizeUserId()` pra hash de ML user_id
- Não expor detalhes de payload em logs

---

---

# 4. SUPABASE RLS

## FIX #4.1 — CRIAR RLS POLICIES

**Severidade:** 🔴 CRÍTICA  
**Arquivo:** Criar nova migration `supabase/migrations/20260904_create_rls_policies.sql`  
**Tempo:** 30 min

### CÓDIGO COMPLETO:

```sql
-- ============================================================================
-- RLS POLICIES FOR QUOTES TABLE
-- ============================================================================

-- Makers can only SELECT their own quotes
CREATE POLICY "quotes_select_own" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

-- Makers can INSERT their own quotes
CREATE POLICY "quotes_insert_own" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Makers can UPDATE their own quotes
CREATE POLICY "quotes_update_own" ON quotes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Makers can DELETE their own quotes
CREATE POLICY "quotes_delete_own" ON quotes
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can see all quotes
CREATE POLICY "quotes_admin_all" ON quotes
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES FOR INTEGRATIONS TABLE
-- ============================================================================

-- Makers can only SELECT their own integrations
CREATE POLICY "integrations_select_own" ON integrations
  FOR SELECT USING (auth.uid() = user_id);

-- Makers can INSERT their own integrations
CREATE POLICY "integrations_insert_own" ON integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Makers can UPDATE their own integrations
CREATE POLICY "integrations_update_own" ON integrations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Makers can DELETE their own integrations
CREATE POLICY "integrations_delete_own" ON integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Admin can see all integrations
CREATE POLICY "integrations_admin_all" ON integrations
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES FOR PROFILES TABLE
-- ============================================================================

-- Makers can SELECT their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Makers can UPDATE their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can see all profiles
CREATE POLICY "profiles_admin_select_all" ON profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES FOR FILAMENTS TABLE
-- ============================================================================

-- Makers can SELECT their own filaments
CREATE POLICY "filaments_select_own" ON filaments
  FOR SELECT USING (auth.uid() = user_id);

-- Makers can INSERT their own filaments
CREATE POLICY "filaments_insert_own" ON filaments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Makers can UPDATE their own filaments
CREATE POLICY "filaments_update_own" ON filaments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Makers can DELETE their own filaments
CREATE POLICY "filaments_delete_own" ON filaments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES FOR CLIENTS TABLE
-- ============================================================================

-- Makers can SELECT their own clients
CREATE POLICY "clients_select_own" ON clients
  FOR SELECT USING (auth.uid() = user_id);

-- Makers can INSERT their own clients
CREATE POLICY "clients_insert_own" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Makers can UPDATE their own clients
CREATE POLICY "clients_update_own" ON clients
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Makers can DELETE their own clients
CREATE POLICY "clients_delete_own" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES FOR PRODUCTS TABLE
-- ============================================================================

-- Makers can SELECT their own products
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);

-- Makers can INSERT their own products
CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Makers can UPDATE their own products
CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Makers can DELETE their own products
CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES FOR SUPPLIERS TABLE (se existir)
-- ============================================================================

-- Makers can SELECT their own suppliers
CREATE POLICY "suppliers_select_own" ON suppliers
  FOR SELECT USING (auth.uid() = user_id);

-- Makers can INSERT their own suppliers
CREATE POLICY "suppliers_insert_own" ON suppliers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Makers can UPDATE their own suppliers
CREATE POLICY "suppliers_update_own" ON suppliers
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### COMO APLICAR:

**Opção A — Via Supabase Dashboard:**
1. Abrir Supabase → SQL Editor
2. Colar todo o SQL acima
3. Executar

**Opção B — Via Migration (recomendado):**
```bash
# Criar arquivo
mkdir -p supabase/migrations
touch supabase/migrations/20260904_create_rls_policies.sql

# Colar código acima
# Depois rodar
supabase db push
```

---

## FIX #4.2 — VERIFICAR QUE RLS FUNCIONA

**Arquivo:** Criar novo arquivo de teste `__tests__/rls.test.ts`  
**Tempo:** 20 min

```typescript
import { createClient } from "@/lib/supabase/client";
import { expect, describe, it } from "vitest";

describe("Row Level Security", () => {
  it("Maker A should not see Maker B's quotes", async () => {
    // Login como Maker A
    const clientA = createClient();
    await clientA.auth.signInWithPassword({
      email: "maker-a@test.com",
      password: "test123",
    });

    // Tentar ler quotes
    const { data: quotesA, error: errorA } = await clientA
      .from("quotes")
      .select("*");

    expect(errorA).toBeNull();
    
    // Filtrar apenas de Maker A
    const makerAId = (await clientA.auth.getUser()).data.user?.id;
    const quotesOwnedByA = quotesA?.filter(q => q.user_id === makerAId) || [];
    
    expect(quotesA?.length).toBe(quotesOwnedByA.length);
    expect(quotesA?.every(q => q.user_id === makerAId)).toBe(true);
  });

  it("Service role should see all quotes", async () => {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await admin
      .from("quotes")
      .select("*");

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  it("Anonymous should not access quotes", async () => {
    const anonClient = createClient(); // Sem login
    
    const { data, error } = await anonClient
      .from("quotes")
      .select("*");

    expect(error).not.toBeNull();
    expect(error?.message).toContain("new row violates row-level security policy");
  });
});
```

---

## FIX #4.3 — ATUALIZAR QUERIES PARA NÃO USAR SERVICE_ROLE

**Arquivo:** Todos os arquivos que usam `createAdminClient`  
**Tempo:** 1-2 horas (depende de quantas queries)

### PADRÃO:

**ANTES (INSEGURO):**
```typescript
const admin = createAdminClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const { data } = await admin.from("quotes").select("*");
// ^ Bypassa RLS — vê TUDO
```

**DEPOIS (SEGURO):**
```typescript
const { data } = await supabase  // Client auth (não admin)
  .from("quotes")
  .select("*");
// ^ RLS ativa — vê apenas suas próprias quotes
```

**Exceções OK (usar service_role):**
- Webhooks (precisam inserir de qualquer maker)
- Admin panels
- Background jobs
- Operações que realmente precisam escalação

---

---

## ✅ CHECKLIST DE APLICAÇÃO

### Dia 1 (Hoje — 4 horas)
- [ ] FIX #1.1 — Idempotência MP
- [ ] FIX #1.2 — Timeout
- [ ] FIX #1.3 — Logs sanitizados
- [ ] FIX #1.4 — Rate limiting por integração
- [ ] FIX #4.1 — RLS policies
- [ ] FIX #4.2 — RLS tests

### Dia 2 (Amanhã — 3 horas)
- [ ] FIX #2.1 — Validar SITE_URL
- [ ] FIX #2.2 — Remove error PII
- [ ] FIX #2.3 — Validar ref code
- [ ] FIX #3.1 — ML IP allowlist
- [ ] FIX #3.2 — ML resource validation
- [ ] FIX #3.3 — ML idempotência

### Dia 3 (Semana — 2 horas)
- [ ] FIX #1.5 — Schema validation (Zod)
- [ ] FIX #4.3 — Auditar todas as queries
- [ ] FIX #4.3 — Remover service_role de queries normais

---

## 🧪 VERIFICAÇÃO FINAL

Antes de colocar em produção:

```bash
# 1. Rodar testes de RLS
npm test -- rls.test.ts

# 2. Verificar logs não têm PII
grep -r "user_id\|mpUserId" app/api/webhooks/ # Não deve encontrar exposto

# 3. Testar webhook com payload malformado
curl -X POST https://localhost:3000/api/webhooks/mercado-pago \
  -H "Content-Type: application/json" \
  -d '{"invalid": "payload"}'
# Deve retornar 400 Bad Request

# 4. Testar rate limiting
for i in {1..100}; do
  curl -X POST https://localhost:3000/api/webhooks/mercado-pago ...
done
# Deve retornar 429 depois de limite
```

---

## 🎯 PRIORIDADES

🔴 PRIMEIRO (Hoje):
- RLS policies (sem isso, dados vazados)
- Idempotência (sem isso, vendas duplicadas)
- ML IP allowlist (sem isso, qualquer um envia webhook falso)

🟠 DEPOIS (Semana):
- Timeout
- Schema validation
- Log sanitization

🟡 DEPOIS (Mês):
- Testes completos
- Documentação
- Auditorias periódicas

---

**Tempo total de implementação: ~2-3 horas**  
**Criticidade: MÁXIMA** — Não colocar em produção sem isso

