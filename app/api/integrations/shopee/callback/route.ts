import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { setIntegrationCredential } from "@/lib/vault";
import { exchangeShopeeCode, getShopeeConfig } from "@/lib/shopee";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function backToIntegrations(req: NextRequest, query: string) {
  return NextResponse.redirect(`${req.nextUrl.origin}/dashboard/integrations?${query}`);
}

/**
 * Recebe `code` + `shop_id` (autorização feita numa conta de loja) e `state`
 * (user id setado em /connect). O code vale 1 vez e expira em 10 minutos —
 * a troca por tokens acontece aqui mesmo. Conta principal (main_account_id)
 * não é suportada: o vendedor precisa autorizar pela conta da própria loja.
 */
export async function GET(req: NextRequest) {
  if (!getShopeeConfig()) {
    return NextResponse.json({ error: "Integração com Shopee ainda não disponível." }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const mainAccountId = req.nextUrl.searchParams.get("main_account_id");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || (!shopId && !mainAccountId)) {
    return backToIntegrations(req, "sp_error=" + encodeURIComponent("autorização não concluída"));
  }
  if (!shopId) {
    return backToIntegrations(
      req,
      "sp_error=" + encodeURIComponent("autorize pela conta da loja (não pela conta principal)")
    );
  }

  // Identidade vem da sessão, não da URL — mesma regra dos outros callbacks.
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !state || user.id !== state) {
    return NextResponse.json({ error: "Sessão inválida — conecte de novo a partir de Integrações." }, { status: 401 });
  }

  let credentials;
  try {
    credentials = await exchangeShopeeCode(code, shopId);
  } catch (err) {
    console.error("[shopee] falha ao trocar o code por token", err);
    return backToIntegrations(req, "sp_error=" + encodeURIComponent("não foi possível concluir a autorização"));
  }

  const admin = adminClient();
  const { data: existing } = await admin
    .from("integrations")
    .select("id, credential_secret_id")
    .eq("user_id", user.id)
    .eq("platform", "shopee")
    .maybeSingle();

  const secretId = await setIntegrationCredential(
    admin,
    existing?.credential_secret_id ?? null,
    JSON.stringify(credentials),
    `shopee:${user.id}`
  );

  await admin.from("integrations").upsert(
    {
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: user.id,
      platform: "shopee",
      status: "connected",
      credential_secret_id: secretId,
    },
    { onConflict: "user_id,platform" }
  );

  return backToIntegrations(req, "sp_connected=1");
}
