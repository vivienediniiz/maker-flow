"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";
import { FakeCursor, useCycle, type CursorStop } from "./FakeCursor";

const CHANNELS = [
  { name: "Mercado Pago", connected: true, note: "Autorize o StudioMaker a acessar suas vendas" },
  { name: "Mercado Livre", connected: true, note: "Conecte sua conta vendedora" },
  { name: "Shopee", connected: false, note: "Conecte sua loja pra receber pedidos" },
  { name: "TikTok Shop", connected: false, note: "Aguardando aprovação do app — em breve", disabled: true },
  { name: "Melhor Envio", connected: true, note: "Calcular, comparar e imprimir etiquetas" },
];

const STOPS: CursorStop[] = [
  { top: "14%", left: "82%" },
  { top: "34%", left: "82%" },
  { top: "54%", left: "82%" },
  { top: "74%", left: "82%" },
  { top: "90%", left: "82%" },
];

export function IntegrationsMockup() {
  const active = useCycle(STOPS.length);

  return (
    <div className="relative space-y-2 p-4 sm:p-5">
      <FakeCursor stops={STOPS} activeIndex={active} />
      <p className="font-display text-sm text-text-primary">Integrações</p>
      <p className="text-[9px] text-text-muted">Conecte suas plataformas de venda e receba pedidos automático.</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CHANNELS.map((c, i) => (
          <div
            key={c.name}
            className={cn(
              "glass-card space-y-1.5 p-2.5 transition-all duration-300",
              i === active && "ring-2 ring-neon-pink/60"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-text-primary">{c.name}</span>
              {c.connected ? (
                <span className="flex items-center gap-1 text-[9px] text-[#00FF9D]">
                  <CheckCircle2 size={10} /> Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] text-text-muted">
                  <XCircle size={10} /> Desconectado
                </span>
              )}
            </div>
            <p className="text-[8px] leading-relaxed text-text-muted">{c.note}</p>
            <p className="text-[8px] text-text-muted">Última sincronização: Nunca</p>
            <span
              className={cn(
                "inline-block rounded-pill px-2 py-0.5 text-[9px]",
                c.disabled
                  ? "cursor-not-allowed bg-white/5 text-text-muted/60"
                  : c.connected
                    ? "border border-border-glassStrong text-text-secondary"
                    : "bg-neon-gradient text-white"
              )}
            >
              {c.connected ? "Desconectar" : "Conectar"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
