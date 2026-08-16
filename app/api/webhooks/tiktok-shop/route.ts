import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * TODO(aguardando aprovação do app no TikTok Shop Partner Center): estrutura
 * pronta, mas isso só recebe eventos reais depois que o app do MakerFlow for
 * aprovado e a URL cadastrada no Partner Center. Até lá, só loga e responde
 * 200 (o TikTok Shop também costuma verificar o endpoint antes de ativar).
 *
 * O formato exato do header de assinatura (nome + algoritmo) varia entre
 * versões da API do TikTok Shop - o cálculo abaixo é o mais comum
 * documentado (HMAC-SHA256 de app_secret + corpo), mas PRECISA ser
 * conferido contra a documentação/sandbox reais no momento da aprovação,
 * antes de confiar nisso pra validar assinatura de verdade.
 *
 * Quando aprovado, falta implementar aqui:
 *  1. Achar a integração pelo shop_id do payload (salvo em connect/callback).
 *  2. Buscar o pedido de verdade via API do TikTok Shop (get order detail).
 *  3. Upsert em `quotes` com source='tiktok_shop', external_order_id=order_id.
 *  4. Atualizar integrations.last_event_at.
 */
export async function POST(req: NextRequest) {
  const appSecret = process.env.TIKTOK_APP_SECRET;
  const rawBody = await req.text();

  if (appSecret) {
    const signatureHeader = req.headers.get("x-tts-signature") ?? "";
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (signatureHeader !== expected) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  console.log("[webhook] tiktok-shop event received (aguardando app aprovado, não processado)", rawBody.slice(0, 500));

  return NextResponse.json({ ok: true });
}
