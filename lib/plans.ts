import type { SubscriptionTier } from "./types";

export type PlanTier = "starter" | "pro";
export type BillingCycle = "monthly" | "annual";
export type PaymentMethod = "card" | "pix";

// Dias de tolerância após o vencimento de um pagamento Pix antes de rebaixar pra Free.
export const PIX_GRACE_PERIOD_DAYS = 3;

// Reverse trial: toda conta nova recebe acesso completo (tier "pro") por esse
// período, sem pedir cartão — depois disso, se não virar assinante de verdade
// (subscription_status = "active"), cai pra "free" automaticamente.
export const TRIAL_DAYS = 14;

export interface CyclePricing {
  price: number; // R$, cobrado a cada `frequencyMonths` meses
  frequencyMonths: number;
  label: string; // "Mensal" | "Anual"
  discountLabel?: string; // ex: "-17%", só no ciclo anual
}

export interface Plan {
  id: PlanTier;
  name: string;
  tagline: string;
  highlighted?: boolean;
  cycles: Record<BillingCycle, CyclePricing>;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Pro maker que já vende todo mês.",
    cycles: {
      monthly: { price: 29, frequencyMonths: 1, label: "Mensal" },
      annual: { price: 290, frequencyMonths: 12, label: "Anual", discountLabel: "-17%" },
    },
    features: [
      "50 orçamentos/vendas por mês",
      "300 clientes cadastrados",
      "150 produtos no catálogo",
      "40 filamentos em estoque",
      "5 impressoras cadastradas",
      "5 filiais",
      "PDF de orçamento com a sua logo, sem marca d'água",
      "Financeiro completo e Insights & BI",
      "Todas as integrações de venda (Mercado Pago, Mercado Livre, Shopee, TikTok Shop)",
      "Suporte por e-mail em até 24h",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Pra quem parou de contar quantos orçamentos fez.",
    highlighted: true,
    cycles: {
      monthly: { price: 69, frequencyMonths: 1, label: "Mensal" },
      annual: { price: 690, frequencyMonths: 12, label: "Anual", discountLabel: "-17%" },
    },
    features: [
      "Tudo do Starter, mais:",
      "Orçamentos/vendas ilimitados",
      "Clientes, produtos, filamentos, impressoras e filiais ilimitados",
      "Suporte prioritário via WhatsApp",
    ],
  },
];

export function getPlan(tier: PlanTier): Plan {
  const plan = PLANS.find((p) => p.id === tier);
  if (!plan) throw new Error(`Plano desconhecido: ${tier}`);
  return plan;
}

export function getCyclePricing(tier: PlanTier, cycle: BillingCycle): CyclePricing {
  return getPlan(tier).cycles[cycle];
}

export function encodeExternalReference(
  userId: string,
  tier: PlanTier,
  cycle: BillingCycle,
  method: PaymentMethod = "card"
) {
  return `${userId}|${tier}|${cycle}|${method}`;
}

export function decodeExternalReference(ref: string) {
  const [userId, tier, cycle, method] = ref.split("|");
  return {
    userId,
    tier: tier as PlanTier,
    cycle: (cycle as BillingCycle) ?? "monthly",
    method: (method as PaymentMethod) ?? "card",
  };
}

export function planDisplayLabel(tier: SubscriptionTier): string {
  if (tier === "free") return "Plano gratuito";
  return getPlan(tier).name;
}

/** Comparativo Grátis x Starter x Pro, reaproveitado em /pricing e /dashboard/subscription. */
export interface FeatureComparisonRow {
  label: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
}

/** Recurso ainda não construído no produto — aparece na tabela mas não é vendido como pronto. */
export const COMING_SOON = "Em breve";

export const FEATURE_COMPARISON: FeatureComparisonRow[] = [
  { label: "Orçamentos/vendas por mês", free: "5", starter: "50", pro: "Ilimitado" },
  { label: "Clientes cadastrados", free: "Até 15", starter: "Até 300", pro: "Ilimitado" },
  { label: "Produtos cadastrados", free: "Até 10", starter: "Até 150", pro: "Ilimitado" },
  { label: "Rolos de filamento", free: "Até 5", starter: "Até 40", pro: "Ilimitado" },
  { label: "Impressoras cadastradas", free: "1", starter: "5", pro: "Ilimitado" },
  { label: "Filiais", free: "Só a matriz", starter: "5", pro: "Ilimitadas" },
  { label: "PDF de orçamento", free: "Com marca d'água", starter: "Com a sua logo", pro: "Com a sua logo" },
  { label: "Baixa automática de estoque", free: false, starter: true, pro: true },
  { label: "Alerta de estoque baixo", free: false, starter: true, pro: true },
  { label: "Dashboard completo", free: false, starter: true, pro: true },
  { label: "Financeiro", free: false, starter: true, pro: true },
  { label: "Insights & BI", free: false, starter: true, pro: true },
  { label: "Insumos e Compras Extras", free: false, starter: true, pro: true },
  { label: "Integrações (Mercado Pago, Mercado Livre, Shopee, TikTok Shop)", free: false, starter: true, pro: true },
  { label: "Link público de aprovação do orçamento", free: false, starter: COMING_SOON, pro: COMING_SOON },
  { label: "Aprovação com assinatura do cliente", free: false, starter: false, pro: COMING_SOON },
  { label: "Importação de .gcode / .3mf", free: false, starter: COMING_SOON, pro: COMING_SOON },
  { label: "Fila de produção (kanban)", free: false, starter: COMING_SOON, pro: COMING_SOON },
  { label: "DRE e fluxo de caixa", free: false, starter: false, pro: COMING_SOON },
  { label: "Usuários na conta", free: "1", starter: "1", pro: COMING_SOON },
  { label: "Suporte", free: "Central de ajuda", starter: "E-mail em 24h", pro: "WhatsApp prioritário" },
];
