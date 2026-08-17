import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

/**
 * Fluxo OAuth do Mercado Livre (marketplace, diferente do Mercado Pago que
 * cuida de pagamento) — o maker clica "Conectar", autoriza o app a acessar
 * a conta vendedora dele, e volta já conectado. Precisa de
 * MERCADO_LIVRE_CLIENT_ID configurado (app criado em
 * developers.mercadolivre.com.br) e do redirect_uri abaixo cadastrado na
 * mesma aplicação.
 */
export async function GET(_req: NextRequest) {
  const clientId = process.env.MERCADO_LIVRE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Integração com Mercado Livre não configurada — falta MERCADO_LIVRE_CLIENT_ID no ambiente." },
      { status: 503 }
    );
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${SITE_URL}/login`);
  }

  const redirectUri = `${SITE_URL}/api/auth/mercado-livre/callback`;

  const authorizeUrl = new URL("https://auth.mercadolivre.com.br/authorization");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", user.id);

  return NextResponse.redirect(authorizeUrl.toString());
}
