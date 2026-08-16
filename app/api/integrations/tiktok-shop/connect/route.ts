import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * TODO(aguardando aprovação): TikTok Shop Partner Center exige um app
 * aprovado (TIKTOK_APP_KEY + TIKTOK_APP_SECRET) antes desse fluxo funcionar
 * de verdade. Estrutura pronta - até lá, o botão "Conectar" no frontend fica
 * desabilitado e essa rota nem é chamada.
 *
 * Fluxo real (quando configurado): GET redireciona pra
 * https://auth.tiktok-shops.com/oauth/authorize; o TikTok Shop volta pro
 * nosso /callback com `code`.
 */
export async function GET(_req: NextRequest) {
  const appKey = process.env.TIKTOK_APP_KEY;

  if (!appKey) {
    return NextResponse.json(
      { error: "Integração com TikTok Shop ainda não disponível — aguardando aprovação do app no TikTok Shop Partner Center." },
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

  const authorizeUrl = new URL("https://auth.tiktok-shops.com/oauth/authorize");
  authorizeUrl.searchParams.set("app_key", appKey);
  authorizeUrl.searchParams.set("state", user.id);

  return NextResponse.redirect(authorizeUrl.toString());
}
