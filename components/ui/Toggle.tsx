"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      {label && <span className="text-sm text-text-secondary">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 rounded-pill transition-colors",
          checked ? "bg-neon-gradient shadow-neon-glow" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            // Deslocamento em rem (não px) — track/thumb também são em rem
            // (w-11/h-5/top-0.5), então isso escala junto em qualquer zoom ou
            // font-size do navegador. Um valor fixo em px aqui desalinhava
            // (o thumb vazava pra fora do track) sempre que o font-size raiz
            // fugia do padrão de 16px.
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}
