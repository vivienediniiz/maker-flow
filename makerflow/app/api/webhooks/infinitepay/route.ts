import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkInfinitePayPayment } from "@/lib/infinitePay";
import { upsertQuotesFromStorefrontCheckout } from "@/lib/mercadoPago";
import type { StoreCheckout } from "@/lib/types";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const INFINITEPAY_HANDLE = process.env.INFINITEPAY_HANDLE;

/**
 * Webhook InfinitePay — a documentação oficial não menciona verificação de
 * assinatura (diferente do Mercado Pago, que a gente já valida), então
 * NUNCA confia no corpo do webhook sozinho: sempre reconfirma via
 * payment_check antes de marcar qualquer coisa como paga.
 *
 * Depois de confirmado, reaproveita upsertQuotesFromStorefrontCheckout
 * (mesma função que o fluxo Mercado Pago já usa) pra criar a(s) venda(s) em
 * `quotes` — assim a venda aparece em Vendas igual a qualquer outra da Loja
 * Online, independente do provedor de pagamento.
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
    .select("*")
    .eq("id", orderNsu)
    .eq("payment_provider", "infinitepay")
    .maybeSingle();

  if (!checkout) {
    // Não é um checkout da Loja Online — pode ser um link gerado a partir de
    // uma Venda Manual (NewSaleModal → InfinitePay), que carrega o id da
    // própria quote em order_nsu. Mesmo padrão de upsertQuoteFromMercadoPagoOrder:
    // só confirma pagamento (awaiting_payment -> paid) de uma venda que já existe.
    const { data: pendingQuote } = await admin
      .from("quotes")
      .select("id, status, final_price")
      .eq("id", orderNsu)
      .eq("payment_method", "infinitepay")
      .maybeSingle();

    if (!pendingQuote) {
      console.log(`[webhook] infinitepay: nenhum checkout ou venda encontrado pro order_nsu ${orderNsu}`);
      return NextResponse.json({ ok: true, skipped: "unknown order_nsu" });
    }

    if (pendingQuote.status !== "awaiting_payment") {
      return NextResponse.json({ ok: true, skipped: "already resolved" });
    }

    let quoteCheck;
    try {
      quoteCheck = await checkInfinitePayPayment({
        handle: INFINITEPAY_HANDLE,
        order_nsu: orderNsu,
        transaction_nsu: transactionNsu,
        slug,
      });
    } catch (err) {
      console.log("[webhook] infinitepay: falha ao chamar payment_check (quote) —", (err as Error).message);
      return NextResponse.json({ error: "Falha ao confirmar pagamento" }, { status: 502 });
    }

    if (!quoteCheck.success || !quoteCheck.paid) {
      console.log("[webhook] infinitepay: payment_check não confirmou pagamento aprovado (quote)", quoteCheck);
      return NextResponse.json({ ok: true, skipped: "not paid" });
    }

    const paidCentavos = quoteCheck.paid_amount ?? quoteCheck.amount;
    const expectedCentavos = Math.round(Number(pendingQuote.final_price) * 100);
    if (paidCentavos != null && Math.abs(paidCentavos - expectedCentavos) > 1) {
      console.log(
        `[webhook] infinitepay: valor pago (${paidCentavos}) diverge do esperado (${expectedCentavos}) pra venda ${pendingQuote.id} — NÃO marcado como pago, precisa de revisão manual`
      );
      return NextResponse.json({ ok: true, skipped: "amount mismatch, needs manual review" });
    }

    const { error: updateError } = await admin
      .from("quotes")
      .update({ status: "paid", infinitepay_transaction_nsu: transactionNsu })
      .eq("id", pendingQuote.id);

    if (updateError) {
      console.log(`[webhook] infinitepay: falha ao marcar venda ${pendingQuote.id} como paga —`, updateError.message);
      return NextResponse.json({ error: "Pagamento confirmado, mas falhou ao atualizar a venda" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
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

  // Grava os dados da confirmação antes de criar a venda — se
  // upsertQuotesFromStorefrontCheckout falhar por algum motivo, o pagamento
  // já confirmado não fica sem rastro nenhum no banco.
  await admin
    .from("store_checkouts")
    .update({
      infinitepay_transaction_nsu: transactionNsu,
      infinitepay_slug: slug,
      infinitepay_receipt_url: check.receipt_url ?? null,
    })
    .eq("id", checkout.id);

  try {
    await upsertQuotesFromStorefrontCheckout(
      admin,
      checkout as StoreCheckout,
      transactionNsu,
      new Date().toISOString(),
      0 // taxa da InfinitePay não vem documentada no payment_check — sem dado real, não presume valor.
    );
  } catch (err) {
    console.log(
      `[webhook] infinitepay: pagamento confirmado mas falhou ao criar a venda pro checkout ${checkout.id} —`,
      (err as Error).message
    );
    return NextResponse.json({ error: "Pagamento confirmado, mas falhou ao registrar a venda" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
