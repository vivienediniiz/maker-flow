import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkInfinitePayPayment } from "@/lib/infinitePay";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const INFINITEPAY_HANDLE = process.env.INFINITEPAY_HANDLE;

/**
 * Webhook InfinitePay — a documentação oficial não menciona verificação de
 * assinatura (diferente do Mercado Pago, que a gente já valida), então
 * NUNCA confia no corpo do webhook sozinho: sempre reconfirma via
 * payment_check antes de marcar qualquer coisa como paga. Só atualiza
 * store_checkouts.status — nenhuma outra ação (criar quote, baixar
 * estoque, notificar) acontece aqui, de propósito (escopo combinado:
 * fluxo de fulfillment do Studio Diniz fica de fora dessa entrega).
 */
export async function POST(req: NextRequest) {
  const admin = adminClient();
  const body = await req.json().catch(() => null);

  const orderNsu: string | null = body?.order_nsu ?? null;
  const transactionNsu: string | null = body?.transaction_nsu ?? null;
  const slug: string | null = body?.slug ?? body?.invoice_slug ?? null;

  console.log("[webhook] infinitepay: recebido", { orderNsu, transactionNsu, slug });

  if (!INFINITEPAY_HANDLE) {
    console.log("[webhook] infinitepay: INFINITEPAY_HANDLE não configurado — ignorado");
    return NextResponse.json({ ok: true, skipped: "not configured" });
  }

  if (!orderNsu || !transactionNsu || !slug) {
    console.log("[webhook] infinitepay: payload incompleto — ignorado", body);
    return NextResponse.json({ ok: true, skipped: "incomplete payload" });
  }

  const { data: checkout } = await admin
    .from("store_checkouts")
    .select("id, status, total_amount")
    .eq("id", orderNsu)
    .eq("payment_provider", "infinitepay")
    .maybeSingle();

  if (!checkout) {
    console.log(`[webhook] infinitepay: nenhum checkout InfinitePay encontrado pro order_nsu ${orderNsu}`);
    return NextResponse.json({ ok: true, skipped: "unknown order_nsu" });
  }

  if (checkout.status === "paid") {
    return NextResponse.json({ ok: true, skipped: "already paid" });
  }

  let check;
  try {
    check = await checkInfinitePayPayment({
      handle: INFINITEPAY_HANDLE,
      order_nsu: orderNsu,
      transaction_nsu: transactionNsu,
      slug,
    });
  } catch (err) {
    console.log("[webhook] infinitepay: falha ao chamar payment_check —", (err as Error).message);
    return NextResponse.json({ error: "Falha ao confirmar pagamento" }, { status: 502 });
  }

  if (!check.success || !check.paid) {
    console.log("[webhook] infinitepay: payment_check não confirmou pagamento aprovado", check);
    return NextResponse.json({ ok: true, skipped: "not paid" });
  }

  const paidAmountCentavos = check.paid_amount ?? check.amount;
  const expectedCentavos = Math.round(Number(checkout.total_amount) * 100);
  if (paidAmountCentavos != null && Math.abs(paidAmountCentavos - expectedCentavos) > 1) {
    console.log(
      `[webhook] infinitepay: valor pago (${paidAmountCentavos}) diverge do esperado (${expectedCentavos}) pro checkout ${checkout.id} — NÃO marcado como pago, precisa de revisão manual`
    );
    return NextResponse.json({ ok: true, skipped: "amount mismatch, needs manual review" });
  }

  await admin
    .from("store_checkouts")
    .update({
      status: "paid",
      infinitepay_transaction_nsu: transactionNsu,
      infinitepay_slug: slug,
      infinitepay_receipt_url: check.receipt_url ?? null,
    })
    .eq("id", checkout.id);

  return NextResponse.json({ ok: true });
}
