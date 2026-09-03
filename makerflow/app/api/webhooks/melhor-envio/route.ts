import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { fetchMelhorEnvioCartItem } from "@/lib/melhorEnvio";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Webhook do Melhor Envio (evento "Atualização das etiquetas criadas e
 * editadas") — URL única pra aplicação inteira, cadastrada uma vez no painel
 * deles. O GET existe porque o Melhor Envio testa a URL de forma síncrona no
 * momento do cadastro; sem 200 aqui, o cadastro falha.
 *
 * O objetivo é capturar o código de rastreio, que só passa a existir quando a
 * transportadora posta o envio — bem depois de a etiqueta ter sido gerada.
 * Por isso `generateAndFetchLabel` quase sempre grava `tracking` null: naquele
 * instante o código ainda não foi emitido, e sem esse webhook ele nunca
 * chegava na venda.
 *
 * A doc do Melhor Envio não é acessível por fetch (mesma limitação já
 * registrada no CLAUDE.md pro Mercado Livre), então o formato do payload aqui
 * é suposição — o id do envio é procurado em vários lugares plausíveis e o
 * corpo inteiro é logado pra poder validar contra um evento real.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}

/** Procura o id do item do carrinho (uuid) nos formatos plausíveis de payload. */
function extractShipmentId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, any>;
  const candidates = [b.id, b.data?.id, b.order?.id, b.data?.order_id, b.order_id];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const admin = adminClient();
  const body = await req.json().catch(() => null);

  const shipmentId = extractShipmentId(body);

  // Loga o corpo cru até o formato estar confirmado contra eventos reais —
  // é a única forma de descobrir a estrutura, já que a doc não é acessível.
  console.log(
    "[webhook] melhor-envio: recebido",
    JSON.stringify({ shipmentId, body }).slice(0, 800)
  );

  if (!shipmentId) {
    return NextResponse.json({ ok: true, skipped: "sem id de envio no payload" });
  }

  const { data: quote } = await admin
    .from("quotes")
    .select("id, user_id, shipping_tracking_code, shipping_label_status")
    .eq("shipping_service_id", shipmentId)
    .maybeSingle();

  if (!quote) {
    // Envio comprado fora do StudioMaker, ou de uma conta que não é cliente —
    // ignora sem erro, igual aos webhooks de Mercado Pago/Livre.
    console.log(`[webhook] melhor-envio: nenhuma venda com shipping_service_id ${shipmentId}`);
    return NextResponse.json({ ok: true, skipped: "envio não é de nenhuma venda" });
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, credential_secret_id, status")
    .eq("user_id", quote.user_id)
    .eq("platform", "melhor_envio")
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    console.log(`[webhook] melhor-envio: maker ${quote.user_id} não tem integração conectada`);
    return NextResponse.json({ ok: true, skipped: "integração desconectada" });
  }

  // Nunca confia no corpo do webhook pro dado que vai pro banco: reconsulta a
  // API com o token do maker, mesma defesa dos webhooks de Mercado Pago/Livre.
  let item;
  try {
    item = await fetchMelhorEnvioCartItem(admin, integration, shipmentId);
  } catch (err) {
    console.log("[webhook] melhor-envio: falha ao consultar o envio —", (err as Error).message);
    return NextResponse.json({ error: "Falha ao consultar o envio" }, { status: 502 });
  }

  const update: Record<string, unknown> = {};

  if (item.tracking && item.tracking !== quote.shipping_tracking_code) {
    update.shipping_tracking_code = item.tracking;
  }

  // "cancelado" é o único estado de envio que o ShippingLabelStatus atual
  // consegue representar (os outros valores descrevem a etiqueta, não o
  // envio). Postado/entregue precisariam de valores novos no enum.
  if (item.status === "canceled" && quote.shipping_label_status !== "cancelado") {
    update.shipping_label_status = "cancelado";
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, skipped: "nada mudou" });
  }

  const { error } = await admin.from("quotes").update(update).eq("id", quote.id);

  if (error) {
    console.log(`[webhook] melhor-envio: falha ao atualizar a venda ${quote.id} —`, error.message);
    return NextResponse.json({ error: "Falha ao atualizar a venda" }, { status: 500 });
  }

  console.log(`[webhook] melhor-envio: venda ${quote.id} atualizada`, update);

  return NextResponse.json({ ok: true });
}
