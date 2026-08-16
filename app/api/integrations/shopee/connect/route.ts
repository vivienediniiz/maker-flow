import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

/**
 * TODO(aguardando aprovação): Shopee Open Platform exige um app aprovado
 * (SHOPEE_PARTNER_ID + SHOPEE_PARTNER_KEY) antes desse fluxo funcionar de
 * verdade. Estrutura pronta pro dia que o app for aprovado - até lá, o botão
 * "Conectar" no frontend fica desabilitado e essa rota nem é chamada.
 *
 * Fluxo real (quando configurado): GET redireciona pra
 * https://partner.shopeemobile.com/api/v2/shop/auth_partner assinado com
 * HMAC-SHA256(partner_id + path + timestamp, partner_key); a Shopee volta
 * pro nosso /callback com `code` + `shop_id`.
 */
export async function GET(_req: NextRequest) {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;

  if (!partnerId || !partnerKey) {
    return NextResponse.json(
      { error: "Integração com Shopee ainda não disponível — aguardando aprovação do app no Shopee Open Platform." },
      { status: 503 }
    );
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const path = "/api/v2/shop/auth_partner";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}`;
  const sign = crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");
  const redirect = `${SITE_URL}/api/integrations/shopee/callback`;

  const authorizeUrl = new URL("https://partner.shopeemobile.com/api/v2/shop/auth_partner");
  authorizeUrl.searchParams.set("partner_id", partnerId);
  authorizeUrl.searchParams.set("redirect", redirect);
  authorizeUrl.searchParams.set("timestamp", String(timestamp));
  authorizeUrl.searchParams.set("sign", sign);
  authorizeUrl.searchParams.set("state", user.id);

  return NextResponse.redirect(authorizeUrl.toString());
}
