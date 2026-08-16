import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { setIntegrationCredential } from "@/lib/vault";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * TODO(aguardando aprovação): recebe `code` + `shop_id` da Shopee e troca
 * por access_token via /api/v2/auth/token/get. `state` carrega o user_id
 * (setado em /connect). Sem SHOPEE_PARTNER_ID/SHOPEE_PARTNER_KEY configurados
 * isso nunca é alcançado, porque /connect já bloqueia antes.
 */
export async function GET(req: NextRequest) {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;

  if (!partnerId || !partnerKey) {
    return NextResponse.json({ error: "Integração com Shopee ainda não disponível." }, { status: 503 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const shopId = req.nextUrl.searchParams.get("shop_id");
  const userId = req.nextUrl.searchParams.get("state");

  if (!code || !shopId || !userId) {
    return NextResponse.json({ error: "Callback da Shopee incompleto" }, { status: 400 });
  }

  const path = "/api/v2/auth/token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = crypto.createHmac("sha256", partnerKey).update(`${partnerId}${path}${timestamp}`).digest("hex");

  const tokenRes = await fetch(
    `https://partner.shopeemobile.com${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(partnerId) }),
    }
  );

  if (!tokenRes.ok) {
    return NextResponse.json({ error: `Shopee respondeu ${tokenRes.status}` }, { status: 502 });
  }

  const tokenData = await tokenRes.json();
  const admin = adminClient();

  const { data: existing } = await admin
    .from("integrations")
    .select("id, credential_secret_id")
    .eq("user_id", userId)
    .eq("platform", "shopee")
    .maybeSingle();

  const secretId = await setIntegrationCredential(
    admin,
    existing?.credential_secret_id ?? null,
    JSON.stringify({ access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, shop_id: shopId }),
    `shopee:${userId}`
  );

  await admin.from("integrations").upsert(
    {
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: userId,
      platform: "shopee",
      status: "connected",
      credential_secret_id: secretId,
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app"}/dashboard/integrations`);
}
