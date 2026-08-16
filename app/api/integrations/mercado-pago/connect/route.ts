import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

/**
 * Fluxo OAuth automático: o maker clica "Conectar", é redirecionado pro
 * Mercado Pago, autoriza o MakerFlow a acessar a conta dele, e volta já
 * conectado — sem colar token manualmente. Precisa de MERCADOPAGO_CLIENT_ID
 * configurado (Suas integrações -> a aplicação -> OAuth, no painel do MP) e
 * do redirect_uri abaixo cadastrado na mesma aplicação.
 */
export async function GET(_req: NextRequest) {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Integração com Mercado Pago não configurada — falta MERCADOPAGO_CLIENT_ID no ambiente." },
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

  const redirectUri = `${SITE_URL}/api/integrations/mercado-pago/callback`;

  const authorizeUrl = new URL("https://auth.mercadopago.com.br/authorization");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("platform_id", "mp");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", user.id);

  return NextResponse.redirect(authorizeUrl.toString());
}
