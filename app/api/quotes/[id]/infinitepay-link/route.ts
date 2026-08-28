import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createInfinitePayCheckoutLink } from "@/lib/infinitePay";
import { apiError } from "@/lib/apiError";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://studiomaker3d.com.br";
const INFINITEPAY_HANDLE = process.env.INFINITEPAY_HANDLE;
// Mesma trava da Loja Online: InfinitePay não é multi-tenant (um handle só,
// sem OAuth por maker) — só o maker dono desse slug pode gerar link, senão
// o dinheiro de qualquer outra conta do SaaS cairia na conta errada.
const INFINITEPAY_STORE_SLUG = process.env.NEXT_PUBLIC_INFINITEPAY_STORE_SLUG;

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Gera (ou devolve a já existente) uma URL de checkout InfinitePay pra uma
 * venda manual já criada — espelha /api/quotes/[id]/payment-link (Mercado
 * Pago), mesmo comportamento de status ("awaiting_payment" até o webhook
 * /api/webhooks/infinitepay confirmar o pagamento via payment_check).
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

  const { data: profile } = await admin.from("profiles").select("store_slug").eq("id", user.id).maybeSingle();

  if (!INFINITEPAY_HANDLE || !INFINITEPAY_STORE_SLUG || profile?.store_slug !== INFINITEPAY_STORE_SLUG) {
    return NextResponse.json({ error: "InfinitePay não está disponível pra essa conta." }, { status: 400 });
  }

  const { data: quote } = await admin
    .from("quotes")
    .select("id, user_id, project_name, final_price, status, payment_link_url")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Venda não encontrada." }, { status: 404 });
  }

  if (quote.status === "cancelled") {
    return NextResponse.json({ error: "Essa venda está cancelada." }, { status: 400 });
  }

  if (quote.payment_link_url) {
    return NextResponse.json({ url: quote.payment_link_url });
  }

  try {
    const link = await createInfinitePayCheckoutLink({
      handle: INFINITEPAY_HANDLE,
      items: [
        {
          quantity: 1,
          price: Math.round(quote.final_price * 100),
          description: quote.project_name || "Venda StudioMaker",
        },
      ],
      order_nsu: quote.id,
      redirect_url: `${SITE_URL}/dashboard/orders`,
      webhook_url: `${SITE_URL}/api/webhooks/infinitepay`,
    });

    await admin
      .from("quotes")
      .update({
        payment_link_url: link.url,
        infinitepay_order_nsu: quote.id,
        status: "awaiting_payment",
      })
      .eq("id", quote.id);

    return NextResponse.json({ url: link.url });
  } catch (err) {
    return apiError("infinitepay-link", err, "Não foi possível gerar o link de pagamento agora. Tente novamente.");
  }
}
