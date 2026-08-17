import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPlan, encodeExternalReference, type PlanId } from "@/lib/plans";

const BodySchema = z.object({
  planId: z.enum(["monthly", "quarterly"]),
});

/**
 * Cria um pagamento Pix avulso (não recorrente) pro plano escolhido.
 * Diferente de /create-preapproval (assinatura automática por cartão), aqui
 * a cobrança é manual: o usuário paga um QR code por vez, e precisa voltar
 * pra renovar no próximo ciclo. O webhook, ao aprovar, estende `paid_until`.
 */
export async function POST(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      { error: "MERCADOPAGO_ACCESS_TOKEN não configurado no servidor." },
      { status: 500 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "É preciso estar autenticado para pagar um plano." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const planId = parsed.data.planId as PlanId;
  const plan = getPlan(planId);
  const amount = plan.price;

  const paymentBody = {
    transaction_amount: amount,
    description: `StudioMaker - Plano ${plan.name}`,
    payment_method_id: "pix",
    external_reference: encodeExternalReference(user.id, planId, "pix"),
    payer: { email: user.email },
  };

  const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `${user.id}-${planId}-${Date.now()}`,
    },
    body: JSON.stringify(paymentBody),
  });

  if (!mpRes.ok) {
    const errBody = await mpRes.text();
    console.error("[mercadopago create-pix-payment] falha", mpRes.status, errBody);
    let detail = errBody;
    try {
      detail = JSON.parse(errBody).message ?? errBody;
    } catch {
      // não era JSON, usa como está
    }
    return NextResponse.json({ error: `Falha ao gerar Pix: ${detail}` }, { status: 502 });
  }

  const payment = await mpRes.json();
  const txData = payment.point_of_interaction?.transaction_data;

  if (!txData?.qr_code) {
    console.error("[mercadopago create-pix-payment] resposta sem QR code", JSON.stringify(payment));
    return NextResponse.json({ error: "Mercado Pago não retornou o QR code do Pix." }, { status: 502 });
  }

  return NextResponse.json(
    {
      paymentId: payment.id,
      qrCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      amount,
    },
    { status: 200 }
  );
}