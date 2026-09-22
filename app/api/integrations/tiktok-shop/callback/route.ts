import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { setIntegrationCredential } from "@/lib/vault";
import { exchangeTikTokShopCode, fetchTikTokShopAuthorizedShops } from "@/lib/tiktokShop";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Recebe `code` (usado como auth_code) + `state` do TikTok Shop e troca por
 * access_token/refresh_token via GET https://auth.tiktok-shops.com/api/v2/token/get.
 * O auth_code expira em 30 minutos e só pode ser usado uma vez — troca
 * precisa acontecer logo no callback, sem passos intermediários.
 * Logo depois, busca o shop_cipher (via Get Authorized Shops) — exigido em
 * quase toda outra chamada de API do TikTok Shop e não vem no token exchange.
 */
export async function GET(req: NextRequest) {
  if (!process.env.TIKTOK_APP_KEY || !process.env.TIKTOK_APP_SECRET) {
    return NextResponse.json({ error: "Integração com TikTok Shop ainda não disponível." }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const authError = req.nextUrl.searchParams.get("error");

  if (authError) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br"}/dashboard/integrations?tt_error=${encodeURIComponent(authError)}`
    );
  }

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

  let tokens;
  try {
    tokens = await exchangeTikTokShopCode(code);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falha ao trocar código" }, { status: 502 });
  }

  // shop_cipher não vem no token exchange — busca separada, best-effort (a
  // integração ainda funciona sem ele até o primeiro webhook, mas fetch de
  // pedido vai falhar sem isso).
  let shopCipher: string | undefined;
  let shopId: string | undefined;
  try {
    const shops = await fetchTikTokShopAuthorizedShops(tokens.access_token);
    shopCipher = shops[0]?.shop_cipher;
    shopId = shops[0]?.shop_id;
  } catch {
    // Segue sem shop_cipher — próxima tentativa de buscar um pedido vai
    // avisar explicitamente que precisa reconectar.
  }

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
    JSON.stringify({ ...tokens, shop_cipher: shopCipher, shop_id: shopId }),
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

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br"}/dashboard/integrations?tt_connected=1`);
}
