"use client";

import { cn } from "@/lib/utils";

const QUOTES = [
  { carrier: "Jadlog .Package", price: "R$ 18,90", days: "5 dias úteis", best: false },
  { carrier: "Correios PAC", price: "R$ 22,40", days: "7 dias úteis", best: false },
  { carrier: "Correios SEDEX", price: "R$ 31,10", days: "2 dias úteis", best: true },
];

export function ShippingMockup() {
  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      <p className="font-display text-sm text-text-primary">Frete</p>
      <p className="text-[8px] text-text-muted">Cotação pra 04510-000 · 300g</p>

      <div className="space-y-2">
        {QUOTES.map((q) => (
          <div
            key={q.carrier}
            className={cn("glass-card flex items-center justify-between p-2.5", q.best && "ring-2 ring-neon-pink/60")}
          >
            <div>
              <p className="text-[10px] font-medium text-text-primary">{q.carrier}</p>
              <p className="text-[8px] text-text-muted">{q.days}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-numeric text-[10px] text-text-secondary">{q.price}</span>
              {q.best && (
                <span className="rounded-pill bg-neon-gradient px-2 py-0.5 text-[8px] font-medium text-white">
                  Gerar etiqueta
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
