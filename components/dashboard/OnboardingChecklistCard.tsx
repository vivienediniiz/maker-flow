"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { WelcomeOnboardingCarousel } from "@/components/dashboard/WelcomeOnboardingCarousel";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS, ONBOARDING_REQUIRED_STEPS, markOnboardingStepComplete, type OnboardingStepKey, type OnboardingStepConfig } from "@/lib/onboarding";
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
    carousel_seen: false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Onboarding do Dashboard, em duas partes:
 * 1. Carrossel de boas-vindas em tela cheia — só no primeiro login
 *    (carousel_seen = false), explica os passos antes de qualquer coisa.
 * 2. Checklist em modal — abre a cada login enquanto os passos obrigatórios
 *    não estiverem completos (inclui logo depois do carrossel, no mesmo
 *    primeiro acesso). Fechar (X/fundo/Esc) esconde só pelo resto da sessão;
 *    "Não mostrar novamente" é que esconde de vez. Complementa, sem
 *    substituir, os avisos contextuais já existentes (ConfigNudgeBanner).
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

  async function handleCarouselFinish() {
    if (!userId) return;
    setProgress((prev) => ({ ...(prev ?? emptyProgress(userId)), carousel_seen: true }));
    await supabase.from("onboarding_progress").upsert({ user_id: userId, carousel_seen: true }, { onConflict: "user_id" });
  }

  function handleStepClick(step: OnboardingStepConfig) {
    handleCloseForNow();
    step.action?.();
  }

  if (loading || !userId) return null;

  if (!progress?.carousel_seen) {
    return <WelcomeOnboardingCarousel steps={ONBOARDING_STEPS} onFinish={handleCarouselFinish} />;
  }

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

        <div className="divide-y divide-border-glass">
          {ONBOARDING_STEPS.map((step) => {
            const done = !!progress?.[step.key];
            const rowContent = (
              <>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    done ? "border-neon-green bg-neon-green/15 text-neon-green" : "border-border-glassStrong text-transparent"
                  )}
                >
                  <Check size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={cn("text-sm font-medium", done ? "text-text-muted line-through" : "text-text-primary")}>
                      {step.title}
                    </p>
                    {step.optional && (
                      <span className="shrink-0 rounded-pill bg-white/5 px-1.5 py-0.5 text-[10px] text-text-muted">Opcional</span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{step.description}</p>
                </div>
              </>
            );

            return (
              <div key={step.key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {step.href ? (
                  <Link href={step.href} onClick={handleCloseForNow} className="flex min-w-0 flex-1 items-center gap-3">
                    {rowContent}
                  </Link>
                ) : (
                  <button type="button" onClick={() => handleStepClick(step)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    {rowContent}
                  </button>
                )}
                {step.optional && !done ? (
                  <button
                    type="button"
                    onClick={() => handleSkip(step.key)}
                    className="shrink-0 text-[11px] text-text-muted transition-colors hover:text-text-secondary"
                  >
                    Pular
                  </button>
                ) : (
                  <ChevronRight size={16} className="shrink-0 text-text-muted" />
                )}
              </div>
            );
          })}
        </div>

        {nextStep && (
          <div className="space-y-3 pt-1">
            {nextStep.href ? (
              <Link href={nextStep.href} onClick={handleCloseForNow} className="block">
                <NeonButton size="sm" className="w-full">
                  <ArrowRight size={14} /> Próximo: {nextStep.title}
                </NeonButton>
              </Link>
            ) : (
              <NeonButton size="sm" className="w-full" onClick={() => handleStepClick(nextStep)}>
                <ArrowRight size={14} /> Próximo: {nextStep.title}
              </NeonButton>
            )}
            <div className="flex items-center justify-center gap-4">
              <Link href="/help" className="text-xs text-text-muted underline hover:text-text-secondary">
                Precisa de ajuda?
              </Link>
              <button
                type="button"
                onClick={handleNeverShowAgain}
                className="text-xs text-text-muted underline transition-colors hover:text-text-secondary"
              >
                Não mostrar novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
