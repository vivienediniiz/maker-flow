"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuoteStatusStepper } from "@/components/dashboard/QuoteStatusStepper";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { QUOTE_STATUS_LABELS, isQuoteSentExpired } from "@/lib/quotes";
import { Loader2 } from "lucide-react";
import type { QuoteWithClient, QuoteStatus } from "@/lib/types";

const FILTERS: { key: "all" | QuoteStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: QUOTE_STATUS_LABELS.sent },
  { key: "paid", label: QUOTE_STATUS_LABELS.paid },
  { key: "in_production", label: QUOTE_STATUS_LABELS.in_production },
  { key: "shipped", label: QUOTE_STATUS_LABELS.shipped },
  { key: "expired", label: QUOTE_STATUS_LABELS.expired },
];

export default function OrdersPage() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<QuoteWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

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
      .order("sent_at", { ascending: false });

    let rows = (data as QuoteWithClient[]) ?? [];

    // Expiração preguiçosa: qualquer orçamento "sent" há mais de 15 dias vira "expired" agora.
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((q) => (
              <GlassCard key={q.id} padding="md" className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{q.project_name}</p>
                    <p className="truncate text-xs text-text-muted">{q.clients?.name ?? "Cliente não informado"}</p>
                  </div>
                  <span className="shrink-0 font-numeric text-sm font-semibold text-neon-pink">
                    {formatBRL(q.final_price)}
                  </span>
                </div>
                <QuoteStatusStepper
                  status={q.status}
                  sentAt={q.sent_at}
                  onChange={(status) => handleStatusChange(q.id, status)}
                />
              </GlassCard>
            ))}
          </div>
        )}
      </main>
    </>
  );
}