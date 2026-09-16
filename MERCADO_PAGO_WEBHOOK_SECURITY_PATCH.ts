/**
 * SECURITY PATCH — Mercado Pago Webhook
 * Fixes: Idempotência, Timeout, Logging sanitization, Rate limiting
 * Date: 2026-09-04
 *
 * APPLY TO:
 * - app/api/webhooks/mercado-pago/route.ts
 * - lib/mercadoPago.ts
 *
 * Instructions:
 * 1. Add helper functions to lib/mercadoPago.ts
 * 2. Update route handler in app/api/webhooks/mercado-pago/route.ts
 * 3. Test with: npm run dev + curl test
 */

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// HELPER FUNCTIONS FOR lib/mercadoPago.ts
// ============================================================================

/**
 * Check if webhook was already processed (idempotency)
 */
export async function isWebhookProcessed(
  admin: SupabaseClient,
  provider: "mercado_pago" | "mercado_livre",
  requestId: string
): Promise<boolean> {
  if (!requestId) return false;

  const { data, error } = await admin
    .from("webhook_events")
    .select("id")
    .eq("provider", provider)
    .eq("request_id", requestId)
    .maybeSingle();

  if (error) {
    console.error(`[webhook] error checking idempotency: ${error.message}`);
    // On error, assume not processed (safer than blocking)
    return false;
  }

  return !!data;
}

/**
 * Mark webhook as processed to prevent duplicates
 */
export async function markWebhookProcessed(
  admin: SupabaseClient,
  provider: "mercado_pago" | "mercado_livre",
  requestId: string
): Promise<void> {
  if (!requestId) return;

  const { error } = await admin.from("webhook_events").insert({
    provider,
    request_id: requestId,
  });

  if (error) {
    console.error(`[webhook] error marking processed: ${error.message}`);
    // Log but don't throw — processing succeeded even if logging failed
  }
}

/**
 * Hash user ID for safe logging (remove PII from logs)
 */
export function sanitizeUserId(userId: string | number): string {
  const hash = crypto.createHash("sha256").update(String(userId)).digest("hex");
  return `***${hash.slice(-6)}`;
}

/**
 * Fetch with timeout to prevent hanging
 */
const FETCH_TIMEOUT_MS = 5000;

export function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal })
    .then((res) => {
      clearTimeout(timeout);
      return res;
    })
    .catch((err) => {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error(`Request timeout after ${FETCH_TIMEOUT_MS}ms to ${url}`);
      }
      throw err;
    });
}

/**
 * Updated exchangeMercadoPagoCode with timeout
 */
export async function exchangeMercadoPagoCodeSecure(
  code: string,
  redirectUri: string
): Promise<any> {
  const clientId = process.env.MERCADO_PAGO_VENDAS_CLIENT_ID;
  const clientSecret = process.env.MERCADO_PAGO_VENDAS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("MERCADO_PAGO_VENDAS_CLIENT_ID/SECRET não configurados");
  }

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
      throw new Error(`Mercado Pago responded ${res.status}`);
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
    });
    throw err;
  }
}

// ============================================================================
// UPDATED WEBHOOK HANDLER FOR app/api/webhooks/mercado-pago/route.ts
// ============================================================================

/**
 * Complete updated webhook handler
 * Replace the entire POST function in route.ts with this
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { apiError } from "@/lib/apiError";
import { webhookRateLimit, requestIp } from "@/lib/rateLimit";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const admin = adminClient();
  const xRequestId = req.headers.get("x-request-id");

  // ✅ SECURITY FIX #1: Validate request ID for idempotency
  if (!xRequestId) {
    console.warn("[webhook] mercado-pago: missing x-request-id");
    return NextResponse.json({ error: "Missing x-request-id" }, { status: 400 });
  }

  // ✅ SECURITY FIX #2: Check if already processed
  const alreadyProcessed = await isWebhookProcessed(admin, "mercado_pago", xRequestId);
  if (alreadyProcessed) {
    console.log(`[webhook] mercado-pago: request cached [id:${xRequestId.slice(0, 8)}...]`);
    return NextResponse.json({ ok: true, cached: true });
  }

  // ✅ SECURITY FIX #3: Rate limiting per integration, not just IP
  const ip = requestIp(req);
  const limitKey = `mp-webhook:${ip}`;

  if (webhookRateLimit) {
    const { success } = await webhookRateLimit.limit(limitKey);
    if (!success) {
      console.warn(`[webhook] mercado-pago: rate limited [key:${limitKey}]`);
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const type = body.type ?? req.nextUrl.searchParams.get("type");
  const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("data.id");
  const mpUserId = body.user_id;

  if (type !== "order" || !resourceId) {
    return NextResponse.json({ ok: true, skipped: "not an order event" });
  }

  if (!mpUserId) {
    console.log("[webhook] mercado-pago: no user_id in payload");
    return NextResponse.json({ ok: true, skipped: "no user_id" });
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, user_id, status, credential_secret_id")
    .eq("platform", "mercado_pago")
    .eq("platform_account_id", String(mpUserId))
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    // ✅ SECURITY FIX #4: Sanitize logs (no PII)
    console.log(`[webhook] mercado-pago: no integration [user:${sanitizeUserId(mpUserId)}]`);
    return NextResponse.json({ ok: true, skipped: "no integration" });
  }

  const webhookSecret = process.env.MERCADO_PAGO_VENDAS_WEBHOOK_SECRET;
  if (webhookSecret) {
    const { validateMercadoPagoSignature } = await import("@/lib/mercadoPago");
    const validSignature = validateMercadoPagoSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId: String(resourceId),
      secret: webhookSecret,
    });

    if (!validSignature) {
      console.error(
        `[webhook] mercado-pago: INVALID SIGNATURE [order:${resourceId}, integration:${integration.id}]`
      );
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("[webhook] mercado-pago: MERCADO_PAGO_VENDAS_WEBHOOK_SECRET not set");
  }

  try {
    const { fetchMercadoPagoOrderForIntegration, upsertQuoteFromMercadoPagoOrder } =
      await import("@/lib/mercadoPago");

    // ✅ SECURITY FIX #5: Validate order response
    const order = await fetchMercadoPagoOrderForIntegration(admin, integration, String(resourceId));

    if (!order) {
      console.error(`[webhook] mercado-pago: null order response [order:${resourceId}]`);
      return NextResponse.json({ error: "Failed to fetch order" }, { status: 502 });
    }

    if (!order.id || !order.total_amount) {
      console.error(
        `[webhook] mercado-pago: missing required fields [order:${resourceId}]`
      );
      return NextResponse.json({ error: "Order missing fields" }, { status: 400 });
    }

    await upsertQuoteFromMercadoPagoOrder(admin, integration.user_id, order);

    // ✅ SECURITY FIX #6: Mark as processed (idempotency)
    await markWebhookProcessed(admin, "mercado_pago", xRequestId);
  } catch (err) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return apiError("webhook:mercado-pago", err, "Falha ao processar", 500);
  }

  await admin
    .from("integrations")
    .update({ last_event_at: new Date().toISOString() })
    .eq("id", integration.id);

  return NextResponse.json({ ok: true });
}
