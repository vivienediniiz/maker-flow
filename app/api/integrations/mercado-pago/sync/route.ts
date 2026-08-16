import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getIntegrationCredential } from "@/lib/vault";
import { upsertQuoteFromMercadoPagoPayment } from "@/lib/mercadoPago";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Fallback pro botão "Sincronizar Pedidos": busca pagamentos aprovados dos
 * últimos 30 dias na API do MP e reprocessa (upsert é idempotente, então
 * rodar isso várias vezes ou junto com o webhook não duplica nada) - útil
 * se algum evento de webhook não chegou.
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
    .select("id, credential_secret_id, status")
    .eq("user_id", user.id)
    .eq("platform", "mercado_pago")
    .maybeSingle();

  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  const accessToken = await getIntegrationCredential(admin, integration.credential_secret_id);
  if (!accessToken) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const searchUrl = new URL("https://api.mercadopago.com/v1/payments/search");
  searchUrl.searchParams.set("sort", "date_created");
  searchUrl.searchParams.set("criteria", "desc");
  searchUrl.searchParams.set("range", "date_created");
  searchUrl.searchParams.set("begin_date", since.toISOString());
  searchUrl.searchParams.set("end_date", new Date().toISOString());

  const res = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    await admin.from("integrations").update({ status: "error" }).eq("id", integration.id);
    return NextResponse.json({ error: `Mercado Pago respondeu ${res.status}` }, { status: 502 });
  }

  const body = await res.json();
  const payments = Array.isArray(body.results) ? body.results : [];

  let synced = 0;
  for (const payment of payments) {
    const created = await upsertQuoteFromMercadoPagoPayment(admin, user.id, payment);
    if (created) synced += 1;
  }

  await admin.from("integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integration.id);

  return NextResponse.json({ ok: true, synced });
}
