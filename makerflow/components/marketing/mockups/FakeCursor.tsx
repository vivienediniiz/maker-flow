"use client";

import { useEffect, useState } from "react";
import { MousePointer2 } from "lucide-react";

export interface CursorStop {
  top: string;
  left: string;
}

/** Cicla um índice de 0..length-1 num intervalo fixo — usado pra sincronizar o cursor falso com o elemento em destaque em cada mockup. */
export function useCycle(length: number, intervalMs = 2600) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);
  return index;
}

/** Cursor animado que "clica" em pontos pré-definidos do mockup, dando a sensação de demo em uso — puramente decorativo. */
export function FakeCursor({ stops, activeIndex }: { stops: CursorStop[]; activeIndex: number }) {
  const stop = stops[activeIndex];
  if (!stop) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1 -translate-y-1 transition-all duration-700 ease-out"
      style={{ top: stop.top, left: stop.left }}
    >
      <span key={activeIndex} className="absolute -inset-3 animate-ping rounded-full bg-neon-pink/40" />
      <MousePointer2 size={16} className="relative fill-white text-white drop-shadow-[0_0_6px_rgba(255,78,223,0.8)]" />
    </div>
  );
}
