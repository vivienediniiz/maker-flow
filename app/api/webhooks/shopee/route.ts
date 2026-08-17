import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * TODO(aguardando aprovação do app no Shopee Open Platform): estrutura e
 * validação de assinatura prontas, mas isso só recebe eventos reais depois
 * que o app do StudioMaker for aprovado e a URL cadastrada no Shopee Open
 * Platform. Até lá, processProof não roda - só loga e responde 200 (a
 * Shopee costuma mandar um ping de verificação ao cadastrar a URL, que
 * precisa de 200 pra validar o endpoint).
 *
 * Quando aprovado, falta implementar aqui:
 *  1. Achar a integração pelo shop_id do payload (salvo em connect/callback).
 *  2. Buscar o pedido de verdade via API da Shopee (get_order_detail) -
 *     igual ao Mercado Pago, nunca confiar só no corpo do push.
 *  3. Upsert em `quotes` com source='shopee', external_order_id=order_sn.
 *  4. Atualizar integrations.last_event_at.
 */
export async function POST(req: NextRequest) {
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  const rawBody = await req.text();

  if (partnerKey) {
    const authHeader = req.headers.get("authorization") ?? "";
    const url = req.nextUrl.toString();
    const expected = crypto.createHmac("sha256", partnerKey).update(`${url}|${rawBody}`).digest("hex");
    if (authHeader !== expected) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  console.log("[webhook] shopee event received (aguardando app aprovado, não processado)", rawBody.slice(0, 500));

  return NextResponse.json({ ok: true });
}
