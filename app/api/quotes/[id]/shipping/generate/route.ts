import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { loadShippingContext, generateAndFetchLabel } from "@/lib/shippingLabel";
import { apiError } from "@/lib/apiError";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Botão "Gerar Etiqueta" — separado da compra porque pode ser chamado de
 * novo como retry se a geração automática (que já roda logo depois da
 * compra) tiver falhado. Não gasta saldo adicional.
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

  if (!quote.shipping_service_id) {
    return NextResponse.json({ error: "Compre o frete antes de gerar a etiqueta." }, { status: 400 });
  }
  if (quote.shipping_label_status !== "comprado" && quote.shipping_label_status !== "gerado") {
    return NextResponse.json({ error: `Status atual (${quote.shipping_label_status}) não permite gerar etiqueta.` }, { status: 400 });
  }

  try {
    const result = await generateAndFetchLabel(admin, integration, quote.shipping_service_id);
    await admin
      .from("quotes")
      .update({
        shipping_label_status: "gerado",
        shipping_generated_at: result.generatedAt,
        shipping_label_url: result.labelUrl,
        ...(result.trackingCode ? { shipping_tracking_code: result.trackingCode } : {}),
      })
      .eq("id", quote.id);

    return NextResponse.json({
      shipping_label_status: "gerado",
      shipping_generated_at: result.generatedAt,
      shipping_label_url: result.labelUrl,
      shipping_tracking_code: result.trackingCode,
    });
  } catch (err) {
    return apiError("shipping-generate", err, "Não foi possível gerar a etiqueta agora. Tente novamente.");
  }
}
