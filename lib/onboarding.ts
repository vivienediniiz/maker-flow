import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingProgress } from "./types";

export type OnboardingStepKey = Exclude<keyof OnboardingProgress, "user_id" | "dismissed" | "updated_at">;

export interface OnboardingStepConfig {
  key: OnboardingStepKey;
  label: string;
  optional?: boolean;
  /** Presente quando o passo navega direto pra uma URL. */
  href?: string;
  /** Presente quando o passo abre um modal via evento global (ex: "Minha Conta"), em vez de navegar. */
  action?: () => void;
}

/**
 * Ordem e conteúdo do checklist de onboarding do Dashboard — única fonte de
 * verdade usada tanto pelo card quanto por qualquer lugar que precise saber
 * quantos passos existem/quais são obrigatórios.
 */
export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    key: "profile_completed",
    label: "Completar dados da Minha Conta (endereço/CEP)",
    action: () => window.dispatchEvent(new Event("open-account-modal")),
  },
  {
    key: "energy_rate_completed",
    label: "Configurar Tarifa de Energia",
    href: "/dashboard/settings#energy",
  },
  {
    key: "labor_rate_completed",
    label: "Configurar Mão de Obra",
    href: "/dashboard/settings#labor",
  },
  {
    key: "printer_registered",
    label: "Cadastrar sua primeira Impressora",
    href: "/dashboard/registrations",
  },
  {
    key: "filament_registered",
    label: "Cadastrar seu primeiro Filamento",
    href: "/dashboard/filaments",
  },
  {
    key: "supplies_registered",
    label: "Cadastrar Insumos",
    optional: true,
    href: "/dashboard/registrations?tab=Insumos",
  },
  {
    key: "fixed_expenses_registered",
    label: "Cadastrar Despesas Fixas",
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
