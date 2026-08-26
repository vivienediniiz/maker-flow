import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { setIntegrationCredential } from "@/lib/vault";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * TODO(aguardando aprovação): recebe `code` do TikTok Shop e troca por
 * access_token via /api/v2/token/get. `state` carrega o user_id (setado em
 * /connect). Sem TIKTOK_APP_KEY/TIKTOK_APP_SECRET configurados isso nunca é
 * alcançado, porque /connect já bloqueia antes.
 */
export async function GET(req: NextRequest) {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json({ error: "Integração com TikTok Shop ainda não disponível." }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Callback do TikTok Shop incompleto" }, { status: 400 });
  }

  // Identidade vem da sessão, não da URL — ver mesma nota em
  // app/api/auth/mercado-pago/callback/route.ts.
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== state) {
    return NextResponse.json({ error: "Sessão inválida — conecte de novo a partir de Integrações." }, { status: 401 });
  }
  const userId = user.id;

  const tokenUrl = new URL("https://auth.tiktok-shops.com/api/v2/token/get");
  tokenUrl.searchParams.set("app_key", appKey);
  tokenUrl.searchParams.set("app_secret", appSecret);
  tokenUrl.searchParams.set("auth_code", code);
  tokenUrl.searchParams.set("grant_type", "authorized_code");

  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) {
    return NextResponse.json({ error: `TikTok Shop respondeu ${tokenRes.status}` }, { status: 502 });
  }

  const tokenData = await tokenRes.json();
  const admin = adminClient();

  const { data: existing } = await admin
    .from("integrations")
    .select("id, credential_secret_id")
    .eq("user_id", userId)
    .eq("platform", "tiktok_shop")
    .maybeSingle();

  const secretId = await setIntegrationCredential(
    admin,
    existing?.credential_secret_id ?? null,
    JSON.stringify(tokenData.data ?? tokenData),
    `tiktok_shop:${userId}`
  );

  await admin.from("integrations").upsert(
    {
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: userId,
      platform: "tiktok_shop",
      status: "connected",
      credential_secret_id: secretId,
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app"}/dashboard/integrations`);
}
