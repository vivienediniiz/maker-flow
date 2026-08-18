import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { setIntegrationCredential } from "@/lib/vault";
import { exchangeMelhorEnvioCode } from "@/lib/melhorEnvio";

// Nunca cachear: cada chamada troca um `code` de uso único por um token real.
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Volta do Melhor Envio com `code` + `state` (user_id, setado em
 * /api/integrations/melhor-envio/connect). Troca o code por
 * access_token/refresh_token, guarda no Vault (mesmo padrão do Mercado
 * Pago — nunca em texto puro na tabela).
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?me_error=${encodeURIComponent(errorParam)}`);
  }
  if (!code || !userId) {
    return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?me_error=callback_incompleto`);
  }

  const admin = adminClient();

  try {
    const tokens = await exchangeMelhorEnvioCode(code, `${SITE_URL}/api/auth/melhor-envio/callback`);

    const { data: existing } = await admin
      .from("integrations")
      .select("id, credential_secret_id")
      .eq("user_id", userId)
      .eq("platform", "melhor_envio")
      .maybeSingle();

    const secretId = await setIntegrationCredential(
      admin,
      existing?.credential_secret_id ?? null,
      JSON.stringify(tokens),
      `melhor_envio:${userId}`
    );

    await admin.from("integrations").upsert(
      {
        ...(existing?.id ? { id: existing.id } : {}),
        user_id: userId,
        platform: "melhor_envio",
        status: "connected",
        credential_secret_id: secretId,
      },
      { onConflict: "user_id,platform" }
    );
  } catch (err) {
    return NextResponse.redirect(
      `${SITE_URL}/dashboard/integrations?me_error=${encodeURIComponent((err as Error).message)}`
    );
  }

  return NextResponse.redirect(`${SITE_URL}/dashboard/integrations?me_connected=1`);
}
