import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { setIntegrationCredential } from "@/lib/vault";
import { exchangeMercadoPagoCode } from "@/lib/mercadoPago";

// Nunca cachear: cada chamada troca um `code` de uso único por um token real.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Volta do Mercado Pago (app "MakerFlow Vendas") com `code` (válido por
 * 10 min) + `state` (user_id, setado em /api/integrations/mercado-pago/connect).
 * Troca o code por access_token/refresh_token/public_key, guarda no Vault, e
 * salva o user_id do vendedor no MP em platform_account_id — é por ele que o
 * webhook de aplicação única (/api/webhooks/mercado-pago) identifica de qual
 * maker é cada notificação.
 *
 * Caminho /api/auth/mercado-pago/callback (não /api/integrations/...) pra
 * bater exatamente com o Redirect URI já cadastrado no painel do app
 * "MakerFlow Vendas" no Mercado Pago.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?mp_error=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !userId) {
    return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?mp_error=callback_incompleto`);
  }

  const admin = adminClient();

  try {
    const tokens = await exchangeMercadoPagoCode(code, `${SITE_URL}/api/auth/mercado-pago/callback`);

    const { data: existing } = await admin
      .from("integrations")
      .select("id, credential_secret_id")
      .eq("user_id", userId)
      .eq("platform", "mercado_pago")
      .maybeSingle();

    const secretId = await setIntegrationCredential(
      admin,
      existing?.credential_secret_id ?? null,
      JSON.stringify(tokens),
      `mercado_pago:${userId}`
    );

    const { error: upsertError } = await admin.from("integrations").upsert(
      {
        ...(existing?.id ? { id: existing.id } : {}),
        user_id: userId,
        platform: "mercado_pago",
        status: "connected",
        credential_secret_id: secretId,
        platform_account_id: String(tokens.user_id),
      },
      { onConflict: "user_id,platform" }
    );

    if (upsertError) throw new Error(upsertError.message);
  } catch (err) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/integrations?mp_error=${encodeURIComponent((err as Error).message)}`
    );
  }

  return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?mp_connected=1`);
}
