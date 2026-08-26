import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { printMelhorEnvioLabel } from "@/lib/melhorEnvio";
import { loadShippingContext } from "@/lib/shippingLabel";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Botão "Imprimir Etiqueta": reaproveita a URL já salva (ou busca de novo
 * se por algum motivo não tiver) e marca shipping_label_status "impresso"
 * — registra a INTENÇÃO de imprimir (o clique), não confirma que a
 * impressão física aconteceu, não tem como via API.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = adminClient();
  const ctx = await loadShippingContext(admin, user.id, params.id);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: 400 });
  }
  const { quote, integration } = ctx;

  if (!quote.shipping_service_id || (quote.shipping_label_status !== "gerado" && quote.shipping_label_status !== "impresso")) {
    return NextResponse.json({ error: "Gere a etiqueta antes de imprimir." }, { status: 400 });
  }

  try {
    const url = quote.shipping_label_url ?? (await printMelhorEnvioLabel(admin, integration, quote.shipping_service_id));
    const printedAt = new Date().toISOString();
    await admin
      .from("quotes")
      .update({ shipping_label_url: url, shipping_label_status: "impresso", shipping_printed_at: printedAt })
      .eq("id", quote.id);
    return NextResponse.json({ url, shipping_label_status: "impresso", shipping_printed_at: printedAt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
