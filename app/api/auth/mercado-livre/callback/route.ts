import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { setIntegrationCredential } from "@/lib/vault";
import { exchangeMercadoLivreCode } from "@/lib/mercadoLivre";

// Nunca cachear: cada chamada troca um `code` de uso único por um token real.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Volta do Mercado Livre com `code` + `state` (user_id, setado em
 * /api/integrations/mercado-livre/connect). Troca o code por
 * access_token/refresh_token, guarda no Vault, e salva o user_id do
 * vendedor no ML em platform_account_id — é por ele que o webhook
 * (/api/webhooks/mercado-livre) identifica de qual maker é cada notificação.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?ml_error=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?ml_error=callback_incompleto`);
  }

  // Identidade vem da sessão, não da URL — ver mesma nota em
  // app/api/auth/mercado-pago/callback/route.ts.
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${SITE_URL}/login?ml_error=sessao_invalida`);
  }
  const userId = user.id;

  const admin = adminClient();

  try {
    const tokens = await exchangeMercadoLivreCode(code, `${SITE_URL}/api/auth/mercado-livre/callback`);

    const { data: existing } = await admin
      .from("integrations")
      .select("id, credential_secret_id")
      .eq("user_id", userId)
      .eq("platform", "mercado_livre")
      .maybeSingle();

    const secretId = await setIntegrationCredential(
      admin,
      existing?.credential_secret_id ?? null,
      JSON.stringify(tokens),
      `mercado_livre:${userId}`
    );

    await admin.from("integrations").upsert(
      {
        ...(existing?.id ? { id: existing.id } : {}),
        user_id: userId,
        platform: "mercado_livre",
        status: "connected",
        credential_secret_id: secretId,
        platform_account_id: String(tokens.user_id),
      },
      { onConflict: "user_id,platform" }
    );
  } catch (err) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/integrations?ml_error=${encodeURIComponent((err as Error).message)}`
    );
  }

  return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?ml_connected=1`);
}
