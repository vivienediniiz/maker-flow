"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, DollarSign, Printer, Package, Rocket, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowserFrame } from "./BrowserFrame";

const PHRASES: { title: string; subtitle: string; icon: LucideIcon }[] = [
  {
    title: "Precifique, produza e venda — tudo em um só lugar.",
    subtitle:
      "Gestão completa para estúdios de impressão 3D: orçamentos inteligentes, pedidos, estoque e insights financeiros em tempo real.",
    icon: DollarSign,
  },
  {
    title: "Sua impressora. Seus números. Seu controle.",
    subtitle: "Acompanhe cada impressão em tempo real e transforme filamento em lucro previsível.",
    icon: Printer,
  },
  {
    title: "Do orçamento à entrega, sem planilha nenhuma.",
    subtitle: "Automatize cotações, controle de estoque e vendas em todos os seus canais, num só painel.",
    icon: Package,
  },
  {
    title: "Feito por quem faz. Pensado pra quem cresce.",
    subtitle:
      "StudioMaker é o ERP que entende a rotina de um estúdio 3D — porque foi construído por dentro de um.",
    icon: Rocket,
  },
];

const TYPE_MS = 42;
const ERASE_MS = 18;
const HOLD_MS = 3400;
const SUBTITLE_DELAY_MS = 300;
const NEXT_PHRASE_DELAY_MS = 350;

function useTypewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);

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
        schedule(() => {
          setShowSubtitle(true);
          schedule(() => holdAndErase(idx), HOLD_MS);
        }, SUBTITLE_DELAY_MS);
      }
    }

    function holdAndErase(idx: number) {
      setShowSubtitle(false);
      schedule(() => eraseTitle(idx, PHRASES[idx].title.length), SUBTITLE_DELAY_MS);
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

  return { phrase: PHRASES[phraseIdx], typed, showSubtitle };
}

export function LandingHero() {
  const { phrase, typed, showSubtitle } = useTypewriter();
  const PhraseIcon = phrase.icon;

  return (
    <div className="relative overflow-hidden">
      {/* Fundo animado: blobs neon suaves atrás do conteúdo */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[10%] top-[-10%] h-[420px] w-[420px] animate-blob-1 bg-neon-purple/20 blur-[110px]" />
        <div className="absolute right-[5%] top-[5%] h-[380px] w-[380px] animate-blob-2 bg-neon-pink/20 blur-[110px]" />
        <div className="absolute bottom-[-15%] left-[30%] h-[400px] w-[400px] animate-blob-3 bg-neon-orange/15 blur-[110px]" />
      </div>

      <main className="px-6 pt-16 text-center md:px-12 md:pt-24">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-glass bg-white/5">
            <PhraseIcon size={22} className="text-neon-pink" />
          </div>
          <h1 className="font-display mt-6 min-h-[7.5rem] text-4xl leading-tight md:min-h-[8.5rem] md:text-5xl xl:text-6xl">
            {typed}
            <span className="animate-caret-blink ml-0.5 inline-block h-[0.9em] w-[3px] translate-y-1 bg-neon-pink align-middle" />
          </h1>
          <p
            className={cn(
              "mt-4 max-w-xl text-text-secondary transition-opacity duration-500",
              showSubtitle ? "opacity-100" : "opacity-0"
            )}
          >
            {phrase.subtitle}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="neon-btn">
            Começar grátis <ArrowRight size={16} />
          </Link>
          <Link
            href="/pricing"
            className="rounded-pill border border-border-glassStrong px-6 py-3 text-sm font-semibold hover:bg-white/5"
          >
            Ver planos
          </Link>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Sem cartão de crédito · 14 dias de acesso completo
        </p>

        {/* Prova visual: dashboard real dentro de um mockup de navegador */}
        <div className="mx-auto mt-16 max-w-4xl text-left">
          <BrowserFrame
            src="/landing/dashboard.jpg"
            alt="Dashboard do StudioMaker com resumo de vendas, metas e evolução financeira"
            width={1897}
            height={908}
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        </div>
      </main>
    </div>
  );
}
