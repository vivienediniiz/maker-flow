"use client";

import { useEffect, useState } from "react";
import { DollarSign, Printer, Package, Rocket, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function AuthTypewriter() {
  const { phrase, typed, showSubtitle } = useTypewriter();
  const PhraseIcon = phrase.icon;

  return (
    <div className="relative max-w-xl space-y-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-glass bg-white/5">
        <PhraseIcon size={22} className="text-neon-pink" />
      </div>
      <h1 className="font-display min-h-[8rem] text-4xl leading-tight text-text-primary xl:min-h-[9rem] xl:text-5xl 2xl:text-6xl">
        {typed}
        <span className="animate-caret-blink ml-0.5 inline-block h-[1em] w-[2px] translate-y-0.5 bg-neon-pink align-middle" />
      </h1>
      <p
        className={cn(
          "max-w-md text-sm text-text-secondary transition-opacity duration-500",
          showSubtitle ? "opacity-100" : "opacity-0"
        )}
      >
        {phrase.subtitle}
      </p>
    </div>
  );
}
