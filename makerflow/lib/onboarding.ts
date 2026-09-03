import type { SupabaseClient } from "@supabase/supabase-js";
import { MapPin, Zap, Clock, Printer, Box, Package, Banknote, type LucideIcon } from "lucide-react";

export type OnboardingStepKey =
  | "profile_completed"
  | "energy_rate_completed"
  | "labor_rate_completed"
  | "printer_registered"
  | "filament_registered"
  | "supplies_registered"
  | "fixed_expenses_registered";

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

export type OnboardingStatus = Record<OnboardingStepKey, boolean>;

/**
 * Verifica ao vivo, contra os dados reais, quais passos já estão completos —
 * em vez de confiar numa flag gravada uma vez que ficaria desatualizada se a
 * pessoa apagasse o cadastro depois (única impressora, único filamento
 * etc). Os dois passos opcionais contam como concluídos também quando
 * marcados como "pulado" (não dá pra derivar isso dos dados).
 */
export async function computeOnboardingStatus(supabase: SupabaseClient, userId: string): Promise<OnboardingStatus> {
  const [{ data: profile }, { data: settings }, printers, filaments, supplies, fixedExpenses] = await Promise.all([
    supabase.from("profiles").select("cep, street, city, state").eq("id", userId).maybeSingle(),
    supabase.from("settings").select("electricity_kwh_rate, hourly_work_rate").eq("user_id", userId).maybeSingle(),
    supabase.from("printer_assets").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("filaments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("supplies").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("fixed_expenses").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    profile_completed: !!(profile?.cep && profile?.street && profile?.city && profile?.state),
    energy_rate_completed: settings?.electricity_kwh_rate != null,
    labor_rate_completed: settings?.hourly_work_rate != null,
    printer_registered: (printers.count ?? 0) > 0,
    filament_registered: (filaments.count ?? 0) > 0,
    supplies_registered: (supplies.count ?? 0) > 0,
    fixed_expenses_registered: (fixedExpenses.count ?? 0) > 0,
  };
}

/** Marca um passo opcional como "pulado" — só existe pros 2 opcionais, já que os obrigatórios não têm essa opção. */
export async function markOnboardingStepSkipped(
  supabase: SupabaseClient,
  userId: string,
  step: "supplies_registered" | "fixed_expenses_registered"
): Promise<void> {
  const column = step === "supplies_registered" ? "supplies_skipped" : "fixed_expenses_skipped";
  await supabase.from("onboarding_progress").upsert({ user_id: userId, [column]: true }, { onConflict: "user_id" });
}
