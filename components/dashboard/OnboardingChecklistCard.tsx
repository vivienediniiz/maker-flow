"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ArrowRight, X, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { WelcomeOnboardingCarousel } from "@/components/dashboard/WelcomeOnboardingCarousel";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEPS,
  ONBOARDING_REQUIRED_STEPS,
  computeOnboardingStatus,
  markOnboardingStepSkipped,
  type OnboardingStatus,
  type OnboardingStepConfig,
} from "@/lib/onboarding";
import type { OnboardingProgress } from "@/lib/types";

/** Fechar no X do card some só pro resto desta sessão — reaparece no próximo login, enquanto faltar passo obrigatório. */
const SESSION_HIDDEN_KEY = "onboarding_card_hidden_session";

function emptyProgress(userId: string): OnboardingProgress {
  return {
    user_id: userId,
    carousel_seen: false,
    supplies_skipped: false,
    fixed_expenses_skipped: false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Onboarding do Dashboard, em duas partes:
 * 1. Carrossel de boas-vindas em tela cheia (pop-up) — só no primeiro login
 *    (carousel_seen = false), traz as mensagens de instrução de cada passo.
 * 2. Checklist como CARD fixo no topo do Dashboard (não modal) — fica
 *    visível ali enquanto faltar algum passo obrigatório, e só some quando
 *    os 5 estiverem completos DE VERDADE: cada passo é verificado ao vivo
 *    contra os dados reais (profiles/settings/printer_assets/filaments),
 *    não por uma flag gravada uma vez — se a pessoa apagar a única
 *    impressora ou zerar a tarifa de energia depois, o passo volta a
 *    aparecer como pendente na próxima vez que o Dashboard carregar.
 *    Complementa, sem substituir, os avisos contextuais já existentes
 *    (ConfigNudgeBanner).
 */
export function OnboardingChecklistCard() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenThisSession, setHiddenThisSession] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_HIDDEN_KEY) === "1") setHiddenThisSession(true);
    } catch {
      // sessionStorage indisponível (ex: aba privada bloqueando) — só significa
      // que o card pode reaparecer numa navegação dentro da mesma sessão.
    }

    let currentUserId: string | null = null;

    async function loadProgress() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      currentUserId = user.id;
      setUserId(user.id);
      const [{ data: progressRow }, liveStatus] = await Promise.all([
        supabase.from("onboarding_progress").select("*").eq("user_id", user.id).maybeSingle(),
        computeOnboardingStatus(supabase, user.id),
      ]);
      setProgress((progressRow as OnboardingProgress) ?? null);
      setStatus(liveStatus);
      setLoading(false);
    }

    loadProgress();

    // "Minha Conta" abre por cima do próprio Dashboard (não navega pra outra
    // página como os demais passos), então o card não remonta sozinho depois
    // de salvar — precisa desse evento pra saber que deve reconsultar.
    async function handleProfileSaved() {
      if (!currentUserId) return;
      const liveStatus = await computeOnboardingStatus(supabase, currentUserId);
      setStatus(liveStatus);
    }
    window.addEventListener("account-profile-saved", handleProfileSaved);
    return () => window.removeEventListener("account-profile-saved", handleProfileSaved);
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

  function handleReopen() {
    setHiddenThisSession(false);
    try {
      sessionStorage.removeItem(SESSION_HIDDEN_KEY);
    } catch {
      // Sem sessionStorage, não tinha ficado escondido entre navegações mesmo.
    }
  }

  async function handleSkip(step: "supplies_registered" | "fixed_expenses_registered") {
    if (!userId) return;
    const column = step === "supplies_registered" ? "supplies_skipped" : "fixed_expenses_skipped";
    setProgress((prev) => ({ ...(prev ?? emptyProgress(userId)), [column]: true }));
    await markOnboardingStepSkipped(supabase, userId, step);
  }

  async function handleCarouselFinish() {
    if (!userId) return;
    setProgress((prev) => ({ ...(prev ?? emptyProgress(userId)), carousel_seen: true }));
    await supabase.from("onboarding_progress").upsert({ user_id: userId, carousel_seen: true }, { onConflict: "user_id" });
  }

  if (loading || !userId || !status) return null;

  if (!progress?.carousel_seen) {
    return <WelcomeOnboardingCarousel steps={ONBOARDING_STEPS} onFinish={handleCarouselFinish} />;
  }

  function isDone(step: OnboardingStepConfig): boolean {
    if (status![step.key]) return true;
    if (step.key === "supplies_registered") return !!progress?.supplies_skipped;
    if (step.key === "fixed_expenses_registered") return !!progress?.fixed_expenses_skipped;
    return false;
  }

  const completedRequired = ONBOARDING_REQUIRED_STEPS.filter(isDone).length;
  const allRequiredDone = completedRequired === ONBOARDING_REQUIRED_STEPS.length;
  const nextStep = ONBOARDING_STEPS.find((s) => !isDone(s));
  const percent = Math.round((completedRequired / ONBOARDING_REQUIRED_STEPS.length) * 100);

  if (allRequiredDone) return null;

  if (hiddenThisSession) {
    return (
      <button
        type="button"
        onClick={handleReopen}
        className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-left text-sm text-amber-200 transition-colors hover:bg-amber-400/15"
      >
        <span className="flex items-center gap-2.5">
          <AlertTriangle size={16} className="shrink-0 text-amber-400" />
          Complete as configurações do seu Studio ({completedRequired} de {ONBOARDING_REQUIRED_STEPS.length} passos) pra aproveitar o sistema por completo.
        </span>
        <span className="shrink-0 rounded-pill bg-amber-400/20 px-4 py-1.5 text-xs font-semibold text-amber-100">
          Completar agora
        </span>
      </button>
    );
  }

  return (
    <GlassCard padding="lg" className="relative space-y-4">
      <button
        type="button"
        onClick={handleCloseForNow}
        className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text-primary"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>

      <div className="pr-6">
        <p className="font-display text-lg">Configure seu Studio</p>
        <p className="mt-1 text-xs text-text-muted">
          {completedRequired} de {ONBOARDING_REQUIRED_STEPS.length} passos
        </p>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-neon-gradient transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="divide-y divide-border-glass">
        {ONBOARDING_STEPS.map((step) => {
          const done = isDone(step);
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
                <Link href={step.href} className="flex min-w-0 flex-1 items-center gap-3">
                  {rowContent}
                </Link>
              ) : (
                <button type="button" onClick={step.action} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {rowContent}
                </button>
              )}
              <div className="flex shrink-0 items-center gap-1.5">
                {step.optional && !done && (
                  <button
                    type="button"
                    onClick={() => handleSkip(step.key as "supplies_registered" | "fixed_expenses_registered")}
                    className="text-[11px] text-text-muted transition-colors hover:text-text-secondary"
                  >
                    Pular
                  </button>
                )}
                <ChevronRight size={16} className="text-text-muted" />
              </div>
            </div>
          );
        })}
      </div>

      {nextStep && (
        <div className="space-y-3 pt-1">
          {nextStep.href ? (
            <Link href={nextStep.href} className="block">
              <NeonButton size="sm" className="w-full">
                <ArrowRight size={14} /> Próximo: {nextStep.title}
              </NeonButton>
            </Link>
          ) : (
            <NeonButton size="sm" className="w-full" onClick={nextStep.action}>
              <ArrowRight size={14} /> Próximo: {nextStep.title}
            </NeonButton>
          )}
          <div className="flex items-center justify-center">
            <Link href="/help" className="text-xs text-text-muted underline hover:text-text-secondary">
              Precisa de ajuda?
            </Link>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
