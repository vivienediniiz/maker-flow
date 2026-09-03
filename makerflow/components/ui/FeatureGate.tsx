"use client";

import { Lock } from "lucide-react";
import type { SubscriptionTier } from "@/lib/types";
import { planDisplayLabel } from "@/lib/plans";

interface FeatureGateProps {
  isAvailable: boolean;
  requiredTier: SubscriptionTier;
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente de "soft paywall" que permite visualizar a feature mas com
 * um overlay de bloqueio e mensagem de upgrade. Usado para dar preview
 * do que virá com plano pago, incentivando upgrade sem frustração.
 */
export function FeatureGate({
  isAvailable,
  requiredTier,
  children,
  className = "",
}: FeatureGateProps) {
  if (isAvailable) {
    return <div className={className}>{children}</div>;
  }

  const planName = planDisplayLabel(requiredTier);

  return (
    <div className={`relative ${className}`}>
      {/* Conteúdo com opacidade reduzida */}
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">
        {children}
      </div>

      {/* Overlay com mensagem de bloqueio */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm">
        <Lock size={32} className="mb-3 text-neon-pink" />
        <p className="mb-2 text-center font-semibold text-white">
          Funcionalidade exclusiva do {planName}
        </p>
        <p className="mb-4 max-w-xs text-center text-sm text-white/70">
          Faça upgrade para acessar esta feature e potencializar suas vendas
        </p>
        <a
          href="/dashboard/subscription"
          className="inline-block rounded-full bg-gradient-to-r from-neon-pink to-neon-purple px-6 py-2 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          Ver Planos →
        </a>
      </div>
    </div>
  );
}

/**
 * Variante mais minimalista para avisos inline (não bloqueia o conteúdo,
 * apenas avisa que precisa upgrade para interagir).
 */
interface FeatureLockedProps {
  requiredTier: SubscriptionTier;
  message?: string;
}

export function FeatureLocked({ requiredTier, message }: FeatureLockedProps) {
  const planName = planDisplayLabel(requiredTier);

  return (
    <div className="rounded-lg border border-neon-pink/30 bg-neon-pink/5 p-4">
      <div className="flex items-start gap-3">
        <Lock size={18} className="mt-0.5 shrink-0 text-neon-pink" />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            Esta funcionalidade é exclusiva do {planName}
          </p>
          {message && (
            <p className="mt-1 text-xs text-white/70">{message}</p>
          )}
          <a
            href="/dashboard/subscription"
            className="mt-2 inline-text-sm font-semibold text-neon-pink hover:text-neon-pink/80"
          >
            Fazer upgrade →
          </a>
        </div>
      </div>
    </div>
  );
}
