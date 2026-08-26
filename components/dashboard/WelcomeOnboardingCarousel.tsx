"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Hand, type LucideIcon } from "lucide-react";
import { NeonButton } from "@/components/ui/NeonButton";
import { cn } from "@/lib/utils";
import type { OnboardingStepConfig } from "@/lib/onboarding";

interface CarouselSlide {
  title: string;
  description: string;
  icon: LucideIcon;
}

const WELCOME_SLIDE: CarouselSlide = {
  title: "Bem-vindo ao StudioMaker3D",
  description: "Antes do primeiro cálculo, configure impressora, materiais e custos. O Dashboard mostra o passo a passo.",
  icon: Hand,
};

interface WelcomeOnboardingCarouselProps {
  steps: OnboardingStepConfig[];
  onFinish: () => void;
}

/**
 * Tour de boas-vindas em tela cheia — só aparece uma vez, no primeiro login
 * (controlado por `carousel_seen` em onboarding_progress). Primeiro slide é
 * uma mensagem de boas-vindas genérica, os demais espelham os passos reais
 * do checklist (mesma fonte de verdade, lib/onboarding.ts). Em telas maiores
 * (tablet/desktop) vira um painel centralizado com fundo/backdrop em vez de
 * ocupar a tela inteira, que só faz sentido no formato mobile.
 */
export function WelcomeOnboardingCarousel({ steps, onFinish }: WelcomeOnboardingCarouselProps) {
  const [index, setIndex] = useState(0);
  const slides: CarouselSlide[] = [WELCOME_SLIDE, ...steps];

  if (typeof document === "undefined") return null;

  const slide = slides[index];
  const Icon = slide.icon;
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  function handleNext() {
    if (isLast) {
      onFinish();
      return;
    }
    setIndex((i) => i + 1);
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:bg-black/50 sm:p-6 sm:backdrop-blur-sm">
      <div className="flex h-full w-full flex-col bg-bg px-6 py-8 sm:h-auto sm:max-h-[85vh] sm:max-w-md sm:rounded-glass sm:border sm:border-border-glass sm:px-8 sm:py-8 sm:shadow-neon-glow">
        <div className="flex shrink-0 justify-end">
          <button
            type="button"
            onClick={onFinish}
            className="text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            Pular
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-neon-gradient-soft">
            <Icon size={40} className="text-neon-pink" />
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-semibold text-text-primary">{slide.title}</h2>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-text-secondary">{slide.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <span
                key={i}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-neon-gradient" : "w-2 bg-white/15")}
              />
            ))}
          </div>

          <div className="flex w-full items-center gap-3">
            {!isFirst && (
              <NeonButton type="button" variant="outline" className="flex-1" onClick={() => setIndex((i) => i - 1)}>
                <ArrowLeft size={16} /> Voltar
              </NeonButton>
            )}
            <NeonButton type="button" className="flex-1" onClick={handleNext}>
              {isLast ? "Começar" : "Próximo"} <ArrowRight size={16} />
            </NeonButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
