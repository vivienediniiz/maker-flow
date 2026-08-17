import type { SubscriptionTier } from "./types";

export type PlanId = "monthly" | "quarterly";
export type PaymentMethod = "card" | "pix";

// Dias de tolerância após o vencimento de um pagamento Pix antes de rebaixar pra Free.
export const PIX_GRACE_PERIOD_DAYS = 3;

// Reverse trial: toda conta nova recebe acesso completo (tier "monthly") por
// esse período, sem pedir cartão — depois disso, se não virar assinante de
// verdade (subscription_status = "active"), cai pra "free" automaticamente.
export const TRIAL_DAYS = 14;

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number; // R$, cobrado a cada `frequencyMonths` meses
  frequencyMonths: number;
  highlighted?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "monthly",
    name: "Mensal",
    tagline: "Acesso completo, cobrado todo mês.",
    price: 19.9,
    frequencyMonths: 1,
    features: [
      "Clientes, produtos e filamentos ilimitados",
      "Filiais ilimitadas",
      "PDF de orçamento sem marca d'água",
      "Dashboard completo (resumo por período, produtos mais vendidos)",
      "Financeiro e Insights & BI liberados",
      "Todas as integrações de venda (Mercado Pago, Mercado Livre, Shopee, TikTok Shop)",
      "Suporte prioritário via WhatsApp",
    ],
  },
  {
    id: "quarterly",
    name: "Trimestral",
    tagline: "Mesmo acesso completo, cobrança a cada 3 meses.",
    price: 49.9,
    frequencyMonths: 3,
    highlighted: true,
    features: [
      "Tudo do plano Mensal",
      "Uma cobrança a cada 3 meses, em vez de todo mês",
    ],
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Plano desconhecido: ${id}`);
  return plan;
}

export function encodeExternalReference(userId: string, planId: PlanId, method: PaymentMethod = "card") {
  return `${userId}|${planId}|${method}`;
}

export function decodeExternalReference(ref: string) {
  const [userId, planId, method] = ref.split("|");
  return {
    userId,
    planId: planId as PlanId,
    method: (method as PaymentMethod) ?? "card",
  };
}

export function planDisplayLabel(tier: SubscriptionTier): string {
  if (tier === "free") return "Plano gratuito";
  return getPlan(tier).name;
}

/** Comparativo Grátis x Pago, reaproveitado em /pricing e /dashboard/subscription. */
export interface FeatureComparisonRow {
  label: string;
  free: string | boolean;
  paid: string | boolean;
}

export const FEATURE_COMPARISON: FeatureComparisonRow[] = [
  { label: "Clientes cadastrados", free: "Até 10", paid: "Ilimitado" },
  { label: "Produtos cadastrados", free: "Até 10", paid: "Ilimitado" },
  { label: "Rolos de filamento", free: "Até 5", paid: "Ilimitado" },
  { label: "Filiais", free: "Só a matriz", paid: "Ilimitadas" },
  { label: "Baixa automática de estoque", free: false, paid: true },
  { label: "Alerta de estoque baixo", free: false, paid: true },
  { label: "PDF de orçamento", free: false, paid: true },
  { label: "Dashboard completo", free: false, paid: true },
  { label: "Financeiro", free: false, paid: true },
  { label: "Insights & BI", free: false, paid: true },
  { label: "Insumos e Compras Extras", free: false, paid: true },
  { label: "Integrações (Mercado Pago, Mercado Livre, Shopee, TikTok Shop)", free: false, paid: true },
  { label: "Suporte", free: "Central de ajuda", paid: "WhatsApp direto" },
];
