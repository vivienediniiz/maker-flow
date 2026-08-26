import type { SupabaseClient } from "@supabase/supabase-js";
import { MapPin, Zap, Clock, Printer, Box, Package, Banknote, type LucideIcon } from "lucide-react";
import type { OnboardingProgress } from "./types";

export type OnboardingStepKey = Exclude<keyof OnboardingProgress, "user_id" | "dismissed" | "carousel_seen" | "updated_at">;

export interface OnboardingStepConfig {
  key: OnboardingStepKey;
  title: string;
  description: string;
  icon: LucideIcon;
  optional?: boolean;
  /** Presente quando o passo navega direto pra uma URL. */
  href?: string;
  /** Presente quando o passo abre um modal via evento global (ex: "Minha Conta"), em vez de navegar. */
  action?: () => void;
}

/**
 * Ordem e conteúdo do onboarding — única fonte de verdade usada tanto pelo
 * carrossel de boas-vindas quanto pelo checklist do Dashboard.
 */
export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    key: "profile_completed",
    title: "Completar dados da Minha Conta",
    description: "Endereço e CEP do seu estúdio — usados no PDF de orçamento e na cotação de frete.",
    icon: MapPin,
    action: () => window.dispatchEvent(new Event("open-account-modal")),
  },
  {
    key: "energy_rate_completed",
    title: "Configurar Tarifa de Energia",
    description: "O valor do kWh da sua conta de luz — entra direto no custo de cada impressão.",
    icon: Zap,
    href: "/dashboard/settings#energy",
  },
  {
    key: "labor_rate_completed",
    title: "Configurar Mão de Obra",
    description: "Quanto vale a sua hora de trabalho — usado pra precificar o tempo de cada peça.",
    icon: Clock,
    href: "/dashboard/settings#labor",
  },
  {
    key: "printer_registered",
    title: "Cadastrar sua primeira Impressora",
    description: "Modelo e consumo — a Calculadora usa isso pra estimar energia e depreciação.",
    icon: Printer,
    href: "/dashboard/registrations",
  },
  {
    key: "filament_registered",
    title: "Cadastrar seu primeiro Filamento",
    description: "Material, cor e preço — sem isso não dá pra calcular o custo de uma peça.",
    icon: Box,
    href: "/dashboard/filaments",
  },
  {
    key: "supplies_registered",
    title: "Cadastrar Insumos",
    description: "Embalagens, colas e outros itens usados por peça ou por lote.",
    icon: Package,
    optional: true,
    href: "/dashboard/registrations?tab=Insumos",
  },
  {
    key: "fixed_expenses_registered",
    title: "Cadastrar Despesas Fixas",
    description: "Aluguel, internet e outras despesas mensais — entram rateadas no preço.",
    icon: Banknote,
    optional: true,
    href: "/dashboard/finance?openFixedExpense=1",
  },
];

export const ONBOARDING_REQUIRED_STEPS = ONBOARDING_STEPS.filter((s) => !s.optional);

/**
 * Marca um passo do checklist como concluído — chamado a partir do save
 * handler de cada tela correspondente (perfil, configurações, impressora,
 * filamento, insumo, despesa fixa), nunca exigindo que o usuário volte ao
 * card manualmente. Best-effort: nunca deixa uma falha aqui derrubar o save
 * de verdade que já aconteceu (por isso quem chama sempre engole o erro).
 */
export async function markOnboardingStepComplete(
  supabase: SupabaseClient,
  userId: string,
  step: OnboardingStepKey
): Promise<void> {
  await supabase.from("onboarding_progress").upsert({ user_id: userId, [step]: true }, { onConflict: "user_id" });
}
