"use client";

import { cn } from "@/lib/utils";

const ORDERS = [
  { channel: "Mercado Livre", product: "Vaso Geométrico Torcido", value: "R$ 89,90", status: "Pago", tone: "green" },
  { channel: "Shopee", product: "Suporte de Celular", value: "R$ 34,90", status: "Em produção", tone: "pink" },
  { channel: "Manual", product: "Chaveiro Personalizado ×3", value: "R$ 45,00", status: "Enviado", tone: "purple" },
  { channel: "Mercado Pago", product: "Luminária Lua", value: "R$ 129,90", status: "Pago", tone: "green" },
];

const TONE_CLASSES: Record<string, string> = {
  green: "bg-[#00FF9D]/15 text-[#00FF9D]",
  pink: "bg-neon-pink/15 text-neon-pink",
  purple: "bg-neon-purple/20 text-[#D08CF5]",
};

export function SalesMockup() {
  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm text-text-primary">Vendas</p>
        <span className="rounded-pill border border-border-glassStrong px-2 py-0.5 text-[9px] text-text-muted">
          Todos os canais
        </span>
      </div>

      <div className="space-y-2">
        {ORDERS.map((o) => (
          <div key={o.product} className="glass-card flex items-center justify-between gap-2 p-2.5">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-text-primary">{o.product}</p>
              <p className="text-[8px] text-text-muted">{o.channel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-numeric text-[10px] text-text-secondary">{o.value}</span>
              <span className={cn("rounded-pill px-2 py-0.5 text-[8px] font-medium", TONE_CLASSES[o.tone])}>
                {o.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
