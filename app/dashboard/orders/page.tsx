"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { KpiCard } from "@/components/ui/KpiCard";
import { formatBRL, cn } from "@/lib/utils";
import { ClipboardList, CalendarClock, Wallet, TrendingUp, MessageCircle, ChevronDown } from "lucide-react";
import type { Order } from "@/lib/types";

const ORDERS: Order[] = [
  { id: "1", user_id: "u1", quote_id: null, client_id: null, client_name: "Rafael Menezes", status_payment: "paid", status_production: "printing", channel: "whatsapp", total_value: 189.9, deadline: "2026-08-09" },
  { id: "2", user_id: "u1", quote_id: null, client_id: null, client_name: "Studio Nine Cosplay", status_payment: "pending", status_production: "queued", channel: "marketplace", total_value: 640.0, deadline: "2026-08-06" },
  { id: "3", user_id: "u1", quote_id: null, client_id: null, client_name: "Ana Beatriz Costa", status_payment: "paid", status_production: "ready", channel: "site", total_value: 95.5, deadline: "2026-08-08" },
  { id: "4", user_id: "u1", quote_id: null, client_id: null, client_name: "Loja Geek Center", status_payment: "paid", status_production: "shipped", channel: "marketplace", total_value: 1240.0, deadline: "2026-08-02" },
  { id: "5", user_id: "u1", quote_id: null, client_id: null, client_name: "Pedro Villela", status_payment: "failed", status_production: "post_processing", channel: "presencial", total_value: 78.0, deadline: "2026-08-05" },
];

const PAYMENT_FILTERS = ["Todos", "pending", "paid", "refunded", "failed"] as const;
const PRODUCTION_FILTERS = ["Todos", "queued", "printing", "post_processing", "ready", "shipped"] as const;

export default function OrdersPage() {
  const [paymentFilter, setPaymentFilter] = useState<(typeof PAYMENT_FILTERS)[number]>("Todos");
  const [productionFilter, setProductionFilter] = useState<(typeof PRODUCTION_FILTERS)[number]>("Todos");
  const [expanded, setExpanded] = useState<string | null>(null);

  const today = new Date("2026-08-07");

  const filtered = ORDERS.filter(
    (o) =>
      (paymentFilter === "Todos" || o.status_payment === paymentFilter) &&
      (productionFilter === "Todos" || o.status_production === productionFilter)
  );

  return (
    <>
      <Topbar title="Gestão de Pedidos" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total em Aberto" value={formatBRL(858.5)} icon={Wallet} accent="orange" />
          <KpiCard label="Pedidos no Mês" value="28" icon={ClipboardList} accent="pink" />
          <KpiCard label="A Entregar Hoje" value="3" icon={CalendarClock} accent="purple" />
          <KpiCard label="Ticket Médio" value={formatBRL(248.68)} icon={TrendingUp} accent="green" />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <FilterGroup label="Pagamento" options={PAYMENT_FILTERS} value={paymentFilter} onChange={setPaymentFilter} />
          <FilterGroup label="Produção" options={PRODUCTION_FILTERS} value={productionFilter} onChange={setProductionFilter} />
        </div>

        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-glass">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Canal</th>
                  <th className="px-6 py-4 font-medium">Pagamento</th>
                  <th className="px-6 py-4 font-medium">Produção</th>
                  <th className="px-6 py-4 font-medium">Prazo</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                  <th className="w-10 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const isLate = new Date(order.deadline) < today && order.status_production !== "shipped";
                  const isOpen = expanded === order.id;
                  return (
                    <>
                      <tr
                        key={order.id}
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                        className="cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4 font-medium text-text-primary">{order.client_name}</td>
                        <td className="px-6 py-4 capitalize text-text-secondary">{order.channel}</td>
                        <td className="px-6 py-4"><StatusBadge status={order.status_payment} /></td>
                        <td className="px-6 py-4"><StatusBadge status={order.status_production} /></td>
                        <td className={cn("px-6 py-4", isLate && "font-medium text-red-400")}>
                          {new Date(order.deadline).toLocaleDateString("pt-BR")}
                          {isLate && <span className="ml-1.5 text-[10px]">● atrasado</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-numeric font-medium text-text-primary">
                          {formatBRL(order.total_value)}
                        </td>
                        <td className="px-4 py-4">
                          <ChevronDown size={14} className={cn("text-text-muted transition-transform", isOpen && "rotate-180")} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-border-glass/60 bg-white/[0.015]">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div className="text-xs text-text-muted">
                                Pedido #{order.id.padStart(4, "0")} · Criado via {order.channel}
                              </div>
                              <button className="neon-btn px-4 py-2 text-xs">
                                <MessageCircle size={14} /> Enviar atualização via WhatsApp
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </main>
    </>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="glass-card flex items-center gap-1 p-1">
      <span className="pl-2 pr-1 text-[11px] text-text-muted">{label}:</span>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-pill px-3 py-1.5 text-xs capitalize transition-colors",
            value === opt ? "bg-neon-gradient text-white" : "text-text-secondary hover:bg-white/5"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
