import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCyclePricing, encodeExternalReference, type PlanTier, type BillingCycle } from "@/lib/plans";

const BodySchema = z.object({
  tier: z.enum(["starter", "pro"]),
  cycle: z.enum(["monthly", "annual"]),
});

/**
 * Cria uma assinatura recorrente (preapproval) no Mercado Pago para o usuário logado
 * e retorna o `init_point` — a URL de checkout para redirecionar o usuário.
 *
 * O status real da assinatura chega depois via /api/webhooks/mercadopago,
 * que lê a mesma external_reference gerada aqui para saber qual usuário/plano/ciclo atualizar.
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
    return NextResponse.json({ error: "É preciso estar autenticado para assinar um plano." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido", details: parsed.error.flatten() }, { status: 400 });
  }

  const tier = parsed.data.tier as PlanTier;
  const cycle = parsed.data.cycle as BillingCycle;
  const cyclePricing = getCyclePricing(tier, cycle);

  const preapprovalBody = {
    reason: `StudioMaker - Plano ${tier === "pro" ? "Pro" : "Starter"} (${cyclePricing.label})`,
    external_reference: encodeExternalReference(user.id, tier, cycle),
    payer_email: user.email,
    back_url: `${req.nextUrl.origin}/dashboard/settings?subscription=success`,
    auto_recurring: {
      frequency: cyclePricing.frequencyMonths,
      frequency_type: "months",
      transaction_amount: cyclePricing.price,
      currency_id: "BRL",
    },
    status: "pending",
  };

  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preapprovalBody),
  });

  if (!mpRes.ok) {
    const errBody = await mpRes.text();
    console.error("[mercadopago create-preapproval] falha", mpRes.status, errBody);
    let detail = errBody;
    try {
      detail = JSON.parse(errBody).message ?? errBody;
    } catch {
      // errBody não era JSON, usa como está
    }
    return NextResponse.json(
      { error: `Falha ao criar assinatura no Mercado Pago: ${detail}` },
      { status: 502 }
    );
  }

  const preapproval = await mpRes.json();

  return NextResponse.json({ init_point: preapproval.init_point }, { status: 200 });
}