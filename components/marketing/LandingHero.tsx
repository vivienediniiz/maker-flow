"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, DollarSign, Printer, Package, Rocket, type LucideIcon } from "lucide-react";
import { AnimatedHeading } from "./motion/AnimatedHeading";
import { BrowserFrame } from "./BrowserFrame";
import { CalculatorMockup } from "./mockups/CalculatorMockup";
import { SidebarMockup } from "./mockups/SidebarMockup";

const EYEBROW =
  "Gestão completa para estúdios de impressão 3D: orçamentos inteligentes, pedidos, estoque e insights financeiros em tempo real.";

const HEADLINE_SEGMENTS = [
  "Calculadora de impressão 3D: custo real e preço que protege seu",
  { text: "lucro.", neon: true } as const,
];

// Curva expo-out: a mesma usada nos reveals de scroll, pro hero e o resto da página baterem juntos.
const EASE = [0.16, 1, 0.3, 1] as const;

const PHRASES: { title: string; icon: LucideIcon }[] = [
  { title: "Precifique, produza e venda — tudo em um só lugar.", icon: DollarSign },
  { title: "Sua impressora. Seus números. Seu controle.", icon: Printer },
  { title: "Do orçamento à entrega, sem planilha nenhuma.", icon: Package },
  { title: "Feito por quem faz. Pensado pra quem cresce.", icon: Rocket },
];

const TYPE_MS = 42;
const ERASE_MS = 18;
const HOLD_MS = 3400;
const NEXT_PHRASE_DELAY_MS = 350;

function useTypewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(t);
    };

    function typeTitle(idx: number, charIdx: number) {
      setTyped(PHRASES[idx].title.slice(0, charIdx));
      if (charIdx < PHRASES[idx].title.length) {
        schedule(() => typeTitle(idx, charIdx + 1), TYPE_MS);
      } else {
        schedule(() => eraseTitle(idx, PHRASES[idx].title.length), HOLD_MS);
      }
    }

    function eraseTitle(idx: number, charIdx: number) {
      setTyped(PHRASES[idx].title.slice(0, charIdx));
      if (charIdx > 0) {
        schedule(() => eraseTitle(idx, charIdx - 1), ERASE_MS);
      } else {
        const next = (idx + 1) % PHRASES.length;
        setPhraseIdx(next);
        schedule(() => typeTitle(next, 0), NEXT_PHRASE_DELAY_MS);
      }
    }

    typeTitle(0, 0);
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return { phrase: PHRASES[phraseIdx], typed };
}

export function LandingHero() {
  const { phrase, typed } = useTypewriter();
  const PhraseIcon = phrase.icon;
  const reduced = useReducedMotion();

  return (
    <div className="relative overflow-hidden">
      {/* Fundo animado: blobs neon suaves atrás do conteúdo. As três posições são as do
          Figma — todos os blobs ficam dentro do hero, senão o overflow-hidden corta o
          degradê no meio e vira uma linha horizontal dura na borda de baixo. A máscara
          apaga o rastro do blur antes da borda, porque a animação ainda desloca os blobs. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_60%,transparent_97%)]">
        <div className="absolute left-[10%] top-[-10%] h-[420px] w-[420px] animate-blob-1 bg-neon-purple/20 blur-[110px]" />
        <div className="absolute right-[5%] top-[5%] h-[380px] w-[380px] animate-blob-2 bg-neon-pink/20 blur-[110px]" />
        <div className="absolute left-[37%] top-[9%] h-[400px] w-[400px] animate-blob-3 bg-neon-orange/15 blur-[110px]" />
      </div>

      {/* Mockups decorativos flanqueando o hero — inclinados e encostados nas bordas, como no Figma */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-16px] top-1/2 z-0 hidden w-72 -translate-y-1/2 opacity-25 blur-[0.5px] lg:block xl:w-80"
      >
        <BrowserFrame className="rotate-[-7.04deg] scale-90">
          <CalculatorMockup />
        </BrowserFrame>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-4px] top-1/2 z-0 hidden w-72 -translate-y-1/2 opacity-25 blur-[0.5px] lg:block xl:w-80"
      >
        <BrowserFrame className="rotate-[5.54deg] scale-90">
          <SidebarMockup />
        </BrowserFrame>
      </div>

      <main className="relative z-10 px-6 pt-16 text-center md:px-12 md:pt-24">
        <div className="mx-auto flex max-w-[705px] flex-col items-center">
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-glass bg-white/5"
          >
            <PhraseIcon size={22} className="text-neon-pink" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="mt-5 max-w-xl text-sm text-text-secondary dark:text-text-secondary text-text-light-secondary"
          >
            {EYEBROW}
          </motion.p>
          {/* leading igual ao tamanho da fonte (60/60 no Figma) e bloco de 4 linhas de altura */}
          <AnimatedHeading
            as="h1"
            trigger="mount"
            delay={0.2}
            stagger={0.05}
            segments={HEADLINE_SEGMENTS}
            className="font-display mt-4 text-4xl leading-none md:text-5xl xl:min-h-[240px] xl:text-6xl"
          />
          <p className="mt-4 min-h-[2rem] max-w-xl text-lg text-text-secondary dark:text-text-secondary text-text-light-secondary md:text-xl">
            {typed}
            <span className="animate-caret-blink ml-0.5 inline-block h-[0.85em] w-[2px] translate-y-0.5 bg-neon-pink align-middle" />
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: reduced ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55, ease: EASE }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link href="/signup" className="neon-btn">
            Começar grátis <ArrowRight size={16} />
          </Link>
          <Link
            href="/pricing"
            className="rounded-pill border border-border-glassStrong px-6 py-3 text-sm font-semibold hover:bg-white/5"
          >
            Ver planos
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.75 }}
          className="mt-3 text-xs text-text-muted dark:text-text-muted text-text-light-muted"
        >
          Sem cartão de crédito · 14 dias de acesso completo
        </motion.p>
      </main>
    </div>
  );
}
