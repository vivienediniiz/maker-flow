export type PlanId = "starter" | "pro" | "studio";
export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number; // R$/mês, cobrado mensalmente
  priceYearly: number; // R$/mês, cobrado anualmente (já com desconto embutido)
  highlighted?: boolean;
  features: string[];
  limits: {
    printers: number | "ilimitado";
    quotesPerMonth: number | "ilimitado";
    branches: number | "ilimitado";
  };
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Para quem está formalizando o hobby.",
    priceMonthly: 29,
    priceYearly: 24, // ~17% off, cobrado anual
    features: [
      "Até 2 impressoras no farm",
      "Calculadora inteligente de orçamentos",
      "Gestão de pedidos e clientes",
      "Estoque 3D básico",
      "Exportação de PDF de orçamento",
    ],
    limits: { printers: 2, quotesPerMonth: 40, branches: 1 },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para estúdios que já vivem de impressão 3D.",
    priceMonthly: 79,
    priceYearly: 65,
    highlighted: true,
    features: [
      "Até 8 impressoras no farm",
      "Telemetria em tempo real (IoT)",
      "Insights & BI completo",
      "Cálculo de frete integrado",
      "Taxas de marketplace configuráveis",
      "Suporte prioritário via WhatsApp",
    ],
    limits: { printers: 8, quotesPerMonth: 300, branches: 2 },
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Para farms grandes e multi-filiais.",
    priceMonthly: 149,
    priceYearly: 124,
    features: [
      "Impressoras ilimitadas",
      "Filiais ilimitadas",
      "Faixas de risco operacional avançadas",
      "Aparência de PDF com marca própria",
      "API de telemetria dedicada",
      "Onboarding assistido",
    ],
    limits: { printers: "ilimitado", quotesPerMonth: "ilimitado", branches: "ilimitado" },
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Plano desconhecido: ${id}`);
  return plan;
}

export function priceFor(plan: Plan, cycle: BillingCycle) {
  return cycle === "monthly" ? plan.priceMonthly : plan.priceYearly;
}

// Codifica o vínculo usuário+plano+ciclo na external_reference do Mercado Pago,
// já que uma preapproval não guarda metadata estruturada por padrão.
export function encodeExternalReference(userId: string, planId: PlanId, cycle: BillingCycle) {
  return `${userId}|${planId}|${cycle}`;
}

export function decodeExternalReference(ref: string) {
  const [userId, planId, cycle] = ref.split("|");
  return { userId, planId: planId as PlanId, cycle: cycle as BillingCycle };
}

export function subscriptionTierFor(planId: PlanId) {
  // profiles.subscription_tier agora aceita 'starter' | 'pro' | 'studio' diretamente.
  return planId;
}

/** Rótulo amigável pro cartão do usuário na sidebar, ex: "Pro · Mensal" ou "Plano gratuito". */
export function planDisplayLabel(tier: "free" | PlanId, cycle: BillingCycle | null) {
  if (tier === "free") return "Plano gratuito";
  const plan = getPlan(tier);
  return `${plan.name} · ${cycle === "yearly" ? "Anual" : "Mensal"}`;
}