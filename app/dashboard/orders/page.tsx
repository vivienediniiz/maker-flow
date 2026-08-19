"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { QuoteDetailModal } from "@/components/dashboard/QuoteDetailModal";
import { NewSaleModal } from "@/components/dashboard/NewSaleModal";
import { SaleSuccessModal } from "@/components/dashboard/SaleSuccessModal";
import { createClient } from "@/lib/supabase/client";
import { cn, formatBRL } from "@/lib/utils";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_PILL_STYLES,
  QUOTE_SOURCE_LABELS,
  QUOTE_SOURCE_BADGE_STYLES,
  formatOrderNumber,
  isQuoteSentExpired,
  nextQuoteAction,
} from "@/lib/quotes";
import { Loader2, Plus, RefreshCw, Trash2, Pencil } from "lucide-react";
import type { QuoteWithClient, QuoteStatus, QuoteSource, Integration } from "@/lib/types";

const STATUS_FILTERS: { key: "all" | QuoteStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: QUOTE_STATUS_LABELS.sent },
  { key: "paid", label: QUOTE_STATUS_LABELS.paid },
  { key: "in_production", label: QUOTE_STATUS_LABELS.in_production },
  { key: "shipped", label: "Pedido Concluído" },
  { key: "expired", label: QUOTE_STATUS_LABELS.expired },
  { key: "cancelled", label: QUOTE_STATUS_LABELS.cancelled },
];

const SOURCE_FILTERS: { key: "all" | QuoteSource; label: string }[] = [
  { key: "all", label: "Todas as Origens" },
  { key: "mercado_livre", label: QUOTE_SOURCE_LABELS.mercado_livre },
  { key: "tiktok_shop", label: QUOTE_SOURCE_LABELS.tiktok_shop },
  { key: "shopee", label: QUOTE_SOURCE_LABELS.shopee },
  { key: "mercado_pago", label: QUOTE_SOURCE_LABELS.mercado_pago },
  { key: "manual", label: QUOTE_SOURCE_LABELS.manual },
];

function relativeTime(iso: string | null) {
  if (!iso) return null;
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes === 1) return "há 1 minuto";
  if (minutes < 60) return `há ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "há 1 hora" : `há ${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

export default function OrdersPage() {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<QuoteWithClient[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["key"]>("all");
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithClient | null>(null);
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteWithClient | null>(null);
  const [successQuote, setSuccessQuote] = useState<QuoteWithClient | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: quoteData }, { data: integrationData }] = await Promise.all([
      supabase
        .from("quotes")
        .select("*, clients(name, phone, email, address), products(name, image_url, category, description, calc_inputs)")
        .eq("user_id", user.id)
        .order("order_number", { ascending: false }),
      supabase.from("integrations").select("*").eq("user_id", user.id),
    ]);

    let rows = (quoteData as QuoteWithClient[]) ?? [];

    const toExpire = rows.filter((q) => isQuoteSentExpired(q.status, q.sent_at));
    if (toExpire.length > 0) {
      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .in("id", toExpire.map((q) => q.id));
      rows = rows.map((q) => (toExpire.some((e) => e.id === q.id) ? { ...q, status: "expired" as QuoteStatus } : q));
    }

    setQuotes(rows);
    setIntegrations((integrationData as Integration[]) ?? []);
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    // Shopee/TikTok Shop ainda não têm API liberada (app aguardando
    // aprovação) — pra essas, isso só recarrega o que já está no Supabase.
    // Mercado Pago tem reconciliação de verdade contra a API deles.
    await fetch("/api/integrations/mercado-pago/sync", { method: "POST" }).catch(() => {});
    await loadAll();
    setSyncing(false);
  }

  async function handleStatusChange(quoteId: string, status: QuoteStatus) {
    const previousStatus = quotes.find((q) => q.id === quoteId)?.status;
    setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
    setSelectedQuote((prev) => (prev && prev.id === quoteId ? { ...prev, status } : prev));
    const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
    if (error) {
      setQuotes((prev) => prev.map((q) => (q.id === quoteId && previousStatus ? { ...q, status: previousStatus } : q)));
      setSelectedQuote((prev) => (prev && prev.id === quoteId && previousStatus ? { ...prev, status: previousStatus } : prev));
      alert("Não foi possível atualizar o status dessa venda. Tente novamente.");
    }
  }

  async function handleDelete(quoteId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta venda? Essa ação não pode ser desfeita.")) return;
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    await supabase.from("quotes").delete().eq("id", quoteId);
  }

  const statusFiltered = statusFilter === "all" ? quotes : quotes.filter((q) => q.status === statusFilter);
  const sourceFiltered = sourceFilter === "all" ? statusFiltered : statusFiltered.filter((q) => q.source === sourceFilter);

  const searchLower = search.trim().toLowerCase().replace(/^#/, "");
  const filtered = !searchLower
    ? sourceFiltered
    : (() => {
        const byNumber = sourceFiltered.filter((q) => {
          const raw = String(q.order_number);
          const padded = raw.padStart(4, "0");
          return raw.includes(searchLower) || padded.includes(searchLower) || (q.external_order_id ?? "").toLowerCase().includes(searchLower);
        });
        if (byNumber.length > 0) return byNumber;
        return sourceFiltered.filter(
          (q) =>
            (q.clients?.name ?? "").toLowerCase().includes(searchLower) ||
            (q.buyer_name ?? "").toLowerCase().includes(searchLower) ||
            q.project_name.toLowerCase().includes(searchLower)
        );
      })();

  const lastSync = integrations
    .filter((i) => i.status === "connected" && i.last_event_at)
    .map((i) => i.last_event_at as string)
    .sort()
    .reverse()[0];

  return (
    <>
      <Topbar
        title="Vendas"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar vendas por nº, cliente, ID externo..."
      />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-text-secondary">{filtered.length} vendas</span>
            <div className="glass-card flex flex-wrap gap-1 p-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "rounded-pill px-4 py-2 text-xs font-medium transition-colors",
                    statusFilter === f.key ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as (typeof SOURCE_FILTERS)[number]["key"])}
              className="glass-input"
            >
              {SOURCE_FILTERS.map((f) => (
                <option key={f.key} value={f.key} className="bg-bg-raised">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <NeonButton variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Sincronizar Pedidos
            </NeonButton>
            <NeonButton onClick={() => setNewSaleModalOpen(true)}>
              <Plus size={16} /> Nova Venda Manual
            </NeonButton>
          </div>
        </div>

        {lastSync && (
          <p className="text-xs text-text-muted">Última sincronização {relativeTime(lastSync)}.</p>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <GlassCard padding="lg" className="text-center text-sm text-text-muted">
            Nenhuma venda encontrada.
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-4 font-medium">Origem</th>
                    <th className="px-6 py-4 font-medium">Pedido</th>
                    <th className="px-6 py-4 font-medium">Cliente</th>
                    <th className="px-6 py-4 font-medium">Data</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Bruto</th>
                    <th className="px-6 py-4 font-medium">Custos</th>
                    <th className="px-6 py-4 font-medium">Líquido</th>
                    <th className="w-40 px-6 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => {
                    const buyerName = q.buyer_name || q.clients?.name || "Cliente não informado";
                    const costs = q.platform_fee + q.cost_amount;
                    const action = nextQuoteAction(q.status);
                    return (
                      <tr
                        key={q.id}
                        onClick={() => setSelectedQuote(q)}
                        className="cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "rounded-pill border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              QUOTE_SOURCE_BADGE_STYLES[q.source]
                            )}
                          >
                            {QUOTE_SOURCE_LABELS[q.source]}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-numeric text-text-secondary">
                          {q.external_order_id ?? formatOrderNumber(q.order_number)}
                        </td>
                        <td className="px-6 py-4">
                          <p className="truncate text-sm font-medium text-text-primary">{buyerName}</p>
                          <p className="truncate text-xs text-text-secondary">{q.project_name}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-text-muted">
                          {new Date(q.sent_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "rounded-pill border px-2.5 py-1 text-[11px] font-medium",
                              QUOTE_STATUS_PILL_STYLES[q.status]
                            )}
                          >
                            {QUOTE_STATUS_LABELS[q.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-numeric text-text-secondary">{formatBRL(q.final_price)}</td>
                        <td className="px-6 py-4 font-numeric text-red-400">{formatBRL(costs)}</td>
                        <td className="px-6 py-4 font-numeric text-neon-green">{formatBRL(q.net_amount)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3">
                            {action && action.label && (
                              <NeonButton
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(q.id, action.next);
                                }}
                              >
                                {action.label}
                              </NeonButton>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingQuote(q);
                              }}
                              className="text-text-muted hover:text-neon-pink"
                              aria-label="Editar venda"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(q.id, e)}
                              className="text-text-muted hover:text-red-400"
                              aria-label="Excluir venda"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
      <NewSaleModal
        open={newSaleModalOpen || !!editingQuote}
        onClose={() => {
          setNewSaleModalOpen(false);
          setEditingQuote(null);
        }}
        quote={editingQuote}
        onCreated={(createdQuote) => {
          loadAll();
          if (createdQuote) setSuccessQuote(createdQuote);
        }}
      />
      <SaleSuccessModal quote={successQuote} onClose={() => setSuccessQuote(null)} />
    </>
  );
}
