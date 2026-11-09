import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { syncTikTokShopOrders } from "@/lib/tiktokShop";

export const maxDuration = 60;

/**
 * Rotina diária (Vercel Cron): reconcilia com o TikTok Shop os pedidos dos
 * últimos 3 dias de todas as lojas conectadas, cobrindo webhooks perdidos sem
 * depender do maker clicar em "Sincronizar Pedidos". Exige
 * `Authorization: Bearer ${CRON_SECRET}` — sem CRON_SECRET configurado, recusa.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: integrations, error } = await admin
    .from("integrations")
    .select("id, user_id, credential_secret_id")
    .eq("platform", "tiktok_shop")
    .eq("status", "connected");
  if (error) return NextResponse.json({ error: "Falha ao listar integrações" }, { status: 500 });

  let ok = 0;
  let failed = 0;
  let inserted = 0;
  for (const integration of integrations ?? []) {
    if (!integration.credential_secret_id) continue;
    try {
      const result = await syncTikTokShopOrders(admin, integration, { sinceDays: 3 });
      inserted += result.inserted;
      ok++;
    } catch (err) {
      failed++;
      console.error("[tiktok-shop-reconcile]", integration.id, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, integrations: ok, failed, inserted });
}
