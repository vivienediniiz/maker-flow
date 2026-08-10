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
 * (nunca confiamos só no corpo do POST) e usamos a external_reference — no formato
 * "userId|planId|cycle", gerada em /api/mercadopago/create-preapproval — para saber
 * exatamente qual perfil e qual plano atualizar.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic = body.type ?? req.nextUrl.searchParams.get("topic");
    const resourceId = body.data?.id ?? req.nextUrl.searchParams.get("id");

    if (!topic || !resourceId) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

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

      const supabase = adminClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: isEffectivelyActive ? planId : "free",
          billing_cycle: isEffectivelyActive ? billingCycle : null,
          subscription_status: subscriptionStatus,
          mp_subscription_id: subscription.id,
        })
        .eq("id", userId);

      if (error) {
        console.error("[mercadopago webhook] falha ao atualizar profile", error);
        return NextResponse.json({ error: "Falha ao sincronizar assinatura" }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[mercadopago webhook] erro", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
