import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { fetchShopeeOrderForIntegration, upsertQuoteFromShopeeOrder, validateShopeeWebhookSignature } from "@/lib/shopee";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Webhook do Shopee — recebe eventos de pedido.
 * Eventa suportados: order/new, order/status_updated, order/cancelled, etc.
 * Payload vem com: event (tipo), shop_id, order_sn, timestamp.
 */
export async function POST(req: NextRequest) {
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  const rawBody = await req.text();

  // Valida assinatura HMAC-SHA256
  if (partnerKey) {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!validateShopeeWebhookSignature({ authHeader, rawBody, partnerKey })) {
      console.warn("[webhook] shopee invalid signature");
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  } else {
    console.warn("[webhook] shopee SHOPEE_PARTNER_KEY not configured");
    return NextResponse.json({ ok: true }); // Pong pra validação inicial
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { event, shop_id: shopId, order_sn: orderSn } = payload;
  if (!event || !shopId || !orderSn) {
    console.warn("[webhook] shopee incomplete payload", { event, shopId, orderSn });
    return NextResponse.json({ ok: true }); // Ignora silenciosamente
  }

  // Filtra eventos relevantes de pedido
  if (!["order/new", "order/status_updated", "order/cancelled"].includes(event)) {
    return NextResponse.json({ ok: true });
  }

  const admin = adminClient();

  try {
    // Acha a integração pelo shop_id (salvo nas credenciais do callback)
    const { data: integrations } = await admin
      .from("integrations")
      .select("id, credential_secret_id, user_id")
      .eq("platform", "shopee")
      .eq("status", "connected");

    if (!integrations || integrations.length === 0) {
      console.warn("[webhook] shopee no integration found");
      return NextResponse.json({ ok: true });
    }

    // Procura pela integração com esse shop_id
    let targetIntegration = null;
    for (const integration of integrations) {
      if (!integration.credential_secret_id) continue;
      try {
        const { getIntegrationCredential } = await import("@/lib/vault");
        const raw = await getIntegrationCredential(admin, integration.credential_secret_id);
        if (raw) {
          const creds = JSON.parse(raw);
          if (creds.shop_id === shopId) {
            targetIntegration = integration;
            break;
          }
        }
      } catch {
        // Ignore credential errors, continue searching
      }
    }

    if (!targetIntegration) {
      console.warn("[webhook] shopee no matching shop_id found", { shopId });
      return NextResponse.json({ ok: true });
    }

    // Busca o pedido completo da API do Shopee
    const order = await fetchShopeeOrderForIntegration(admin, targetIntegration, orderSn);

    // Cria/atualiza a venda
    await upsertQuoteFromShopeeOrder(admin, targetIntegration.user_id, order);

    // Atualiza timestamp do último evento
    await admin
      .from("integrations")
      .update({ last_event_at: new Date().toISOString() })
      .eq("id", targetIntegration.id);

    console.log("[webhook] shopee order processed", { event, shopId, orderSn });
  } catch (error) {
    console.error("[webhook] shopee error processing", { error, event, shopId, orderSn });
    // Retorna 200 mesmo com erro — Shopee não faz retry, e queremos evitar filas de eventos perdidos
  }

  return NextResponse.json({ ok: true });
}
