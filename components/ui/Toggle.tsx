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
  // ✅ A11y: Keyboard support for Space to toggle
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label className="flex cursor-pointer items-center gap-3">
      {label && <span className="text-sm text-text-secondary">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative h-6 w-11 rounded-pill transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink",
          checked ? "bg-neon-gradient shadow-neon-glow" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
            // left-0.5/right-0.5 direto (em vez de translate-x com uma
            // distância calculada) — sempre exatos, independente de zoom,
            // font-size raiz ou arredondamento de sub-pixel. Um translateX
            // com distância fixa dependia de track/thumb baterem certinho
            // e deixava o thumb vazando pra fora em alguns cenários.
            checked ? "right-0.5" : "left-0.5"
          )}
        />
      </button>
    </label>
  );
}
