import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decodeExternalReference } from "@/lib/plans";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const MP_STATUS_TO_SUBSCRIPTION_STATUS: Record<string, "active" | "paused" | "cancelled" | "inactive"> = {
  authorized: "active",
  paused: "paused",
  cancelled: "cancelled",
  pending: "inactive",
};

/**
 * Mercado Pago envia { type, data: { id } }. Sempre re-consultamos o recurso na API do MP
 * (nunca confiamos só no corpo do POST). Dois fluxos possíveis, identificados pelo `topic`:
 *
 *  - "subscription_preapproval" / "preapproval" → assinatura automática por cartão.
 *    external_reference no formato "userId|planId|cycle|card".
 *
 *  - "payment" → pagamento avulso via Pix (renovação manual).
 *    external_reference no formato "userId|planId|cycle|pix".
 *    Quando aprovado, estende profiles.paid_until em +30 ou +365 dias.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = body.type ?? req.nextUrl.searchParams.get("topic");
    const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("id");

    if (!topic || !resourceId) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const supabase = adminClient();

    // --- Fluxo 1: assinatura automática por cartão (preapproval) ---
    if (topic === "subscription_preapproval" || topic === "preapproval") {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        return NextResponse.json({ error: "Falha ao consultar Mercado Pago" }, { status: 502 });
      }

      const subscription = await mpRes.json();
      const rawRef: string | undefined = subscription.external_reference;

      if (!rawRef || !rawRef.includes("|")) {
        console.warn("[mercadopago webhook] external_reference ausente ou em formato antigo:", rawRef);
        return NextResponse.json({ received: true, skipped: "unrecognized_reference" }, { status: 200 });
      }

      const { userId, planId } = decodeExternalReference(rawRef);
      const mpStatus: string = subscription.status;
      const subscriptionStatus = MP_STATUS_TO_SUBSCRIPTION_STATUS[mpStatus] ?? "inactive";
      const isEffectivelyActive = subscriptionStatus === "active";
      const cycleMonths = subscription.auto_recurring?.frequency_type === "months"
        ? subscription.auto_recurring?.frequency
        : null;
      const billingCycle = cycleMonths === 12 ? "yearly" : "monthly";

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: isEffectivelyActive ? planId : "free",
          billing_cycle: isEffectivelyActive ? billingCycle : null,
          subscription_status: subscriptionStatus,
          payment_method: isEffectivelyActive ? "card" : null,
          paid_until: null,
          mp_subscription_id: subscription.id,
        })
        .eq("id", userId);

      if (error) {
        console.error("[mercadopago webhook] falha ao atualizar profile (preapproval)", error);
        return NextResponse.json({ error: "Falha ao sincronizar assinatura" }, { status: 500 });
      }
    }

    // --- Fluxo 2: pagamento avulso via Pix (renovação manual) ---
    if (topic === "payment") {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        return NextResponse.json({ error: "Falha ao consultar Mercado Pago" }, { status: 502 });
      }

      const payment = await mpRes.json();
      const rawRef: string | undefined = payment.external_reference;

      if (!rawRef || !rawRef.includes("|")) {
        return NextResponse.json({ received: true, skipped: "unrecognized_reference" }, { status: 200 });
      }

      const { userId, planId, cycle, method } = decodeExternalReference(rawRef);

      if (method !== "pix") {
        return NextResponse.json({ received: true, skipped: "not_pix" }, { status: 200 });
      }

      if (payment.status === "approved") {
        const periodDays = cycle === "yearly" ? 365 : 30;
        const paidUntil = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_tier: planId,
            billing_cycle: cycle,
            subscription_status: "active",
            payment_method: "pix",
            paid_until: paidUntil,
          })
          .eq("id", userId);

        if (error) {
          console.error("[mercadopago webhook] falha ao atualizar profile (pix)", error);
          return NextResponse.json({ error: "Falha ao sincronizar pagamento Pix" }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[mercadopago webhook] erro", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}