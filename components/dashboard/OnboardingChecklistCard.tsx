"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Check, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS, ONBOARDING_REQUIRED_STEPS, markOnboardingStepComplete, type OnboardingStepKey } from "@/lib/onboarding";
import type { OnboardingProgress } from "@/lib/types";

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
 * de Y passos" de apps concorrentes. Não bloqueia nada (só some se a pessoa
 * fechar no X, mesmo com passos pendentes) e complementa, sem substituir, os
 * avisos contextuais já existentes (ConfigNudgeBanner na Calculadora).
 */
export function OnboardingChecklistCard() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  async function handleSkip(step: OnboardingStepKey) {
    if (!userId) return;
    setProgress((prev) => ({ ...(prev ?? emptyProgress(userId)), [step]: true }));
    await markOnboardingStepComplete(supabase, userId, step);
  }

  async function handleDismiss() {
    if (!userId) return;
    setProgress((prev) => ({ ...(prev ?? emptyProgress(userId)), dismissed: true }));
    await supabase.from("onboarding_progress").upsert({ user_id: userId, dismissed: true }, { onConflict: "user_id" });
  }

  if (loading || !userId || progress?.dismissed) return null;

  const completedRequired = ONBOARDING_REQUIRED_STEPS.filter((s) => progress?.[s.key]).length;
  if (completedRequired === ONBOARDING_REQUIRED_STEPS.length) return null;

  const nextStep = ONBOARDING_STEPS.find((s) => !progress?.[s.key]);
  const percent = Math.round((completedRequired / ONBOARDING_REQUIRED_STEPS.length) * 100);

  return (
    <GlassCard padding="lg" className="relative space-y-4">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text-primary"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>

      <div className="pr-6">
        <p className="font-display text-lg">Configure seu StudioMaker3D</p>
        <p className="mt-1 text-xs text-text-muted">
          {completedRequired} de {ONBOARDING_REQUIRED_STEPS.length} passos
        </p>
      </div>

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
            <Link href={nextStep.href}>
              <NeonButton size="sm">
                Próximo: {nextStep.label} <ChevronRight size={14} />
              </NeonButton>
            </Link>
          ) : (
            <NeonButton size="sm" onClick={nextStep.action}>
              Próximo: {nextStep.label} <ChevronRight size={14} />
            </NeonButton>
          )}
          <Link href="/help" className="text-xs text-text-muted underline hover:text-text-secondary">
            Precisa de ajuda?
          </Link>
        </div>
      )}
    </GlassCard>
  );
}
