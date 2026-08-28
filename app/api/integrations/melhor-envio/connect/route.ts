import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { melhorEnvioAuthorizeUrl } from "@/lib/melhorEnvio";

// Essa rota decide o redirect com base no cookie de sessão de quem chama —
// nunca pode ser cacheada pelo CDN, senão a resposta de um request vira a
// resposta de todo mundo (foi exatamente isso que aconteceu em producao).
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";

/**
 * Fluxo OAuth: o maker clica "Conectar", é redirecionado pro Melhor Envio,
 * autoriza o app do StudioMaker a cotar/comprar frete usando a conta dele, e
 * volta já conectado. Precisa de MELHOR_ENVIO_CLIENT_ID configurado e do
 * redirect_uri abaixo cadastrado no mesmo app (painel de integrações do
 * Melhor Envio).
 */
export async function GET(_req: NextRequest) {
  const clientId = process.env.MELHOR_ENVIO_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Integração com Melhor Envio não configurada — falta MELHOR_ENVIO_CLIENT_ID no ambiente." },
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

  const redirectUri = `${SITE_URL}/api/auth/melhor-envio/callback`;
  const authorizeUrl = melhorEnvioAuthorizeUrl({ clientId, redirectUri, state: user.id });

  return NextResponse.redirect(authorizeUrl);
}
