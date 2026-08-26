"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS, ONBOARDING_REQUIRED_STEPS, markOnboardingStepComplete, type OnboardingStepKey } from "@/lib/onboarding";
import type { OnboardingProgress } from "@/lib/types";

/** Fechar "por agora" (X do modal, clique no fundo, Esc) some só pro resto desta sessão — reabre no próximo login, enquanto faltar passo obrigatório. */
const SESSION_HIDDEN_KEY = "onboarding_modal_hidden_session";

function emptyProgress(userId: string): OnboardingProgress {
  return {
    user_id: userId,
    profile_completed: false,
    energy_rate_completed: false,
    labor_rate_completed: false,
    printer_registered: false,
    filament_registered: false,
    supplies_registered: false,
    fixed_expenses_registered: false,
    dismissed: false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Checklist de onboarding — inspirado no padrão "Configure a calculadora — X
 * de Y passos" de apps concorrentes. Abre como modal automaticamente a cada
 * login enquanto os passos obrigatórios não estiverem completos; fechar (X/
 * fundo/Esc) só esconde pelo resto da sessão atual, "Não mostrar novamente"
 * é que esconde de vez. Complementa, sem substituir, os avisos contextuais já
 * existentes (ConfigNudgeBanner na Calculadora).
 */
export function OnboardingChecklistCard() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenThisSession, setHiddenThisSession] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_HIDDEN_KEY) === "1") setHiddenThisSession(true);
    } catch {
      // sessionStorage indisponível (ex: aba privada bloqueando) — só significa
      // que o modal pode reaparecer numa navegação dentro da mesma sessão.
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const { data } = await supabase.from("onboarding_progress").select("*").eq("user_id", user.id).maybeSingle();
      setProgress((data as OnboardingProgress) ?? null);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCloseForNow() {
    setHiddenThisSession(true);
    try {
      sessionStorage.setItem(SESSION_HIDDEN_KEY, "1");
    } catch {
      // Sem sessionStorage, só não persiste entre navegações — sem quebra.
    }
  }

  async function handleSkip(step: OnboardingStepKey) {
    if (!userId) return;
    setProgress((prev) => ({ ...(prev ?? emptyProgress(userId)), [step]: true }));
    await markOnboardingStepComplete(supabase, userId, step);
  }

  async function handleNeverShowAgain() {
    if (!userId) return;
    setProgress((prev) => ({ ...(prev ?? emptyProgress(userId)), dismissed: true }));
    await supabase.from("onboarding_progress").upsert({ user_id: userId, dismissed: true }, { onConflict: "user_id" });
  }

  function handleNextStepClick() {
    // Evita empilhar o modal de "Minha Conta" por cima deste — os outros
    // passos navegam pra outra página, então isso não faz diferença neles.
    handleCloseForNow();
    nextStep?.action?.();
  }

  if (loading || !userId) return null;

  const completedRequired = ONBOARDING_REQUIRED_STEPS.filter((s) => progress?.[s.key]).length;
  const allRequiredDone = completedRequired === ONBOARDING_REQUIRED_STEPS.length;
  const nextStep = ONBOARDING_STEPS.find((s) => !progress?.[s.key]);
  const percent = Math.round((completedRequired / ONBOARDING_REQUIRED_STEPS.length) * 100);

  const open = !progress?.dismissed && !hiddenThisSession && !allRequiredDone;

  return (
    <Modal open={open} onClose={handleCloseForNow} title="Configure seu Studio" maxWidthClass="max-w-lg">
      <div className="space-y-4">
        <p className="text-xs text-text-muted">
          {completedRequired} de {ONBOARDING_REQUIRED_STEPS.length} passos
        </p>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon-gradient transition-all" style={{ width: `${percent}%` }} />
        </div>

        <div className="space-y-1">
          {ONBOARDING_STEPS.map((step) => {
            const done = !!progress?.[step.key];
            return (
              <div key={step.key} className="flex items-center justify-between gap-2 py-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      done ? "border-neon-green bg-neon-green/15 text-neon-green" : "border-border-glassStrong text-transparent"
                    )}
                  >
                    <Check size={12} />
                  </span>
                  <span className={cn("truncate text-sm", done ? "text-text-muted line-through" : "text-text-secondary")}>
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="shrink-0 rounded-pill bg-white/5 px-1.5 py-0.5 text-[10px] text-text-muted">Opcional</span>
                  )}
                </div>
                {step.optional && !done && (
                  <button
                    type="button"
                    onClick={() => handleSkip(step.key)}
                    className="shrink-0 text-[11px] text-text-muted transition-colors hover:text-text-secondary"
                  >
                    Pular
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {nextStep && (
          <div className="flex flex-wrap items-center gap-4 pt-1">
            {nextStep.href ? (
              <Link href={nextStep.href} onClick={handleCloseForNow}>
                <NeonButton size="sm">
                  Próximo: {nextStep.label} <ChevronRight size={14} />
                </NeonButton>
              </Link>
            ) : (
              <NeonButton size="sm" onClick={handleNextStepClick}>
                Próximo: {nextStep.label} <ChevronRight size={14} />
              </NeonButton>
            )}
            <Link href="/help" className="text-xs text-text-muted underline hover:text-text-secondary">
              Precisa de ajuda?
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={handleNeverShowAgain}
          className="text-[11px] text-text-muted underline transition-colors hover:text-text-secondary"
        >
          Não mostrar novamente
        </button>
      </div>
    </Modal>
  );
}
