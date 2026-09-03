"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, X } from "lucide-react";

function storageKey(id: string) {
  return `config_nudge_dismissed_${id}`;
}

interface ConfigNudgeBannerProps {
  id: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
}

/** Aviso discreto e dispensável (não bloqueia nada) sugerindo preencher uma configuração ainda vazia. Some por aquela sessão ao ser fechado (sessionStorage) — volta a aparecer em sessões futuras enquanto a config não for preenchida. */
export function ConfigNudgeBanner({ id, message, ctaLabel, ctaHref }: ConfigNudgeBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(storageKey(id)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [id]);

  function handleDismiss() {
    try {
      sessionStorage.setItem(storageKey(id), "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neon-pink/20 bg-neon-pink/5 px-6 py-3 text-sm text-text-secondary md:px-8">
      <div className="flex items-center gap-2.5">
        <Info size={16} className="shrink-0 text-neon-pink" />
        <span>{message}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link href={ctaHref} className="rounded-pill bg-neon-gradient px-4 py-1.5 text-xs font-semibold text-white shadow-neon-glow">
          {ctaLabel}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar aviso"
          className="text-text-muted hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
