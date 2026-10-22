import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { buildShopeeAuthUrl, getShopeeConfig } from "@/lib/shopee";

/**
 * Manda o vendedor pro link de autorização da Shopee (Brasil). O link usa
 * partner_id + auth_type + redirect_uri + response_type + state, sem
 * assinatura (doc: developer-guide/20). O domínio do redirect_uri precisa ser
 * o mesmo cadastrado no Console (Test/Live Redirect URL Domain), por isso
 * vem da origem da própria requisição (www.studiomaker3d.com.br em produção).
 */
export async function GET(req: NextRequest) {
  if (!getShopeeConfig()) {
    return NextResponse.json(
      { error: "Integração com Shopee ainda não disponível — falta configurar SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY." },
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

  const redirectUri = `${req.nextUrl.origin}/api/integrations/shopee/callback`;
  return NextResponse.redirect(buildShopeeAuthUrl(redirectUri, user.id));
}
