"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuoteDetailModal } from "@/components/dashboard/QuoteDetailModal";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { QUOTE_STATUS_LABELS, isQuoteSentExpired, formatOrderNumber } from "@/lib/quotes";
import { Loader2 } from "lucide-react";
import type { QuoteWithClient, QuoteStatus } from "@/lib/types";

const FILTERS: { key: "all" | QuoteStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: QUOTE_STATUS_LABELS.sent },
  { key: "paid", label: QUOTE_STATUS_LABELS.paid },
  { key: "in_production", label: QUOTE_STATUS_LABELS.in_production },
  { key: "shipped", label: "Pedido Concluído" },
  { key: "expired", label: QUOTE_STATUS_LABELS.expired },
];

export default function OrdersPage() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<QuoteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithClient | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("quotes")
      .select("*, clients(name, phone)")
      .eq("user_id", user.id)
      .order("order_number", { ascending: false });

    let rows = (data as QuoteWithClient[]) ?? [];

    const toExpire = rows.filter((q) => isQuoteSentExpired(q.status, q.sent_at));
    if (toExpire.length > 0) {
      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .in("id", toExpire.map((q) => q.id));
      rows = rows.map((q) => (toExpire.some((e) => e.id === q.id) ? { ...q, status: "expired" as QuoteStatus } : q));
    }

    setQuotes(rows);
    setLoading(false);
  }

  async function handleStatusChange(quoteId: string, status: QuoteStatus) {
    setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
    setSelectedQuote((prev) => (prev && prev.id === quoteId ? { ...prev, status } : prev));
    await supabase.from("quotes").update({ status }).eq("id", quoteId);
  }

  const filtered = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);

  return (
    <>
      <Topbar title="Pedidos" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="glass-card flex flex-wrap gap-1 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-pill px-4 py-2 text-xs font-medium transition-colors",
                filter === f.key ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <GlassCard padding="lg" className="text-center text-sm text-text-muted">
            Nenhum pedido nessa categoria ainda.
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-4 font-medium">Nº</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Produto</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => setSelectedQuote(q)}
                      className="cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 font-numeric text-text-muted">{formatOrderNumber(q.order_number)}</td>
                      <td className="px-6 py-4 font-medium text-text-primary">
                        {q.clients?.name ?? "Cliente não informado"}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-text-secondary">{q.project_name}</td>
                      <td className="px-6 py-4">
                        <StatusPill status={q.status} />
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {new Date(q.sent_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right font-numeric font-medium text-text-primary">
                        {formatBRL(q.final_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </main>

      <QuoteDetailModal
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

function StatusPill({ status }: { status: QuoteStatus }) {
  const styles: Record<QuoteStatus, string> = {
    sent: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
    paid: "bg-neon-green/15 text-neon-green border-neon-green/30",
    in_production: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
    shipped: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
    expired: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const labels: Record<QuoteStatus, string> = {
    sent: "Orçamento Enviado",
    paid: "Pago",
    in_production: "Em Produção",
    shipped: "Concluído",
    expired: "Expirado",
  };
  return (
    <span className={cn("inline-flex items-center rounded-pill border px-2.5 py-1 text-[11px] font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}