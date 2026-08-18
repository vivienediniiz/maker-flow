import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Essa rota decide o redirect com base no cookie de sessão de quem chama —
// nunca pode ser cacheada pelo CDN, senão a resposta de um request vira a
// resposta de todo mundo (foi exatamente isso que aconteceu em producao,
// na rota equivalente do Melhor Envio).
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

/**
 * Fluxo OAuth automático: o maker clica "Conectar", é redirecionado pro
 * Mercado Pago, autoriza o app "MakerFlow Vendas" a acessar a conta dele, e
 * volta já conectado — sem colar token manualmente. Esse app é separado do
 * "Makerflow3d" (usado só pra assinatura do StudioMaker — não mexer). Precisa
 * de MERCADO_PAGO_VENDAS_CLIENT_ID configurado (Suas integrações -> app
 * "MakerFlow Vendas" -> OAuth, no painel do MP) e do redirect_uri abaixo
 * cadastrado na mesma aplicação.
 */
export async function GET(_req: NextRequest) {
  const clientId = process.env.MERCADO_PAGO_VENDAS_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Integração com Mercado Pago não configurada — falta MERCADO_PAGO_VENDAS_CLIENT_ID no ambiente." },
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

  const redirectUri = `${SITE_URL}/api/auth/mercado-pago/callback`;

  const authorizeUrl = new URL("https://auth.mercadopago.com.br/authorization");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("platform_id", "mp");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", user.id);
  // "read" pra buscar os pedidos/pagamentos, "offline_access" pra ganhar
  // refresh_token (sem isso o token some em algumas horas e a gente não
  // consegue renovar sozinho). Sem declarar scope nenhum, o Mercado Pago
  // pode rejeitar a autorização com "não foi possível conectar o aplicativo".
  authorizeUrl.searchParams.set("scope", "read offline_access");

  return NextResponse.redirect(authorizeUrl.toString());
}
