import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Redireciona pro fluxo de autorização do TikTok Shop. Diferente de
 * Mercado Pago/Livre/Shopee, o TikTok Shop NÃO usa client_id/redirect_uri
 * na URL — usa `service_id` (identificador do app OAuth registrado,
 * visível em Partner Center → App & Service → detalhes do app), e o
 * Redirect URL/escopos ficam configurados no próprio app, não na URL.
 * Confirmado em https://partner.tiktokshop.com/docv2/page/authorization-overview:
 *  - US: https://services.us.tiktokshop.com/open/authorize?service_id={service_id}
 *  - ROW: https://services.tiktokshop.com/open/authorize?service_id={service_id}
 * Após aprovação, o TikTok Shop redireciona pro Redirect URL configurado
 * no app com `?code={auth_code}&state={state}`.
 *
 * TIKTOK_SERVICE_ID NÃO é o Client key/app_key (testado e confirmado —
 * usar o Client key aqui retorna "This service does not exist" da TikTok).
 * É o "App ID" (número longo) visível em Manage apps -> seu app.
 */
export async function GET(_req: NextRequest) {
  const serviceId = process.env.TIKTOK_SERVICE_ID;

  if (!serviceId) {
    return NextResponse.json(
      { error: "Integração com TikTok Shop ainda não disponível — falta configurar TIKTOK_SERVICE_ID." },
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

  // Mercado ROW (fora dos EUA) — StudioMaker é uma plataforma brasileira.
  const authorizeUrl = new URL("https://services.tiktokshop.com/open/authorize");
  authorizeUrl.searchParams.set("service_id", serviceId);
  authorizeUrl.searchParams.set("state", user.id);

  return NextResponse.redirect(authorizeUrl.toString());
}
