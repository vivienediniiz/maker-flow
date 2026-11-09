import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { syncTikTokShopOrders } from "@/lib/tiktokShop";
import { apiError } from "@/lib/apiError";

export const maxDuration = 60;

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Botão "Sincronizar Pedidos": reconcilia com o TikTok Shop os pedidos dos
 * últimos 30 dias — registra os que o webhook não entregou e atualiza status.
 * Idempotente: pode rodar várias vezes, junto ou depois do webhook.
 */
export async function POST(_req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = adminClient();

  const { data: integration } = await admin
    .from("integrations")
    .select("id, user_id, credential_secret_id, status")
    .eq("user_id", user.id)
    .eq("platform", "tiktok_shop")
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const result = await syncTikTokShopOrders(admin, integration, { sinceDays: 30 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return apiError("tiktok-shop-sync", err, "Não foi possível sincronizar os pedidos do TikTok Shop agora. Tente novamente.");
  }
}
