"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { QuoteDetailModal } from "@/components/dashboard/QuoteDetailModal";
import { NewSaleModal } from "@/components/dashboard/NewSaleModal";
import { SaleCard } from "@/components/dashboard/SaleCard";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { QUOTE_STATUS_LABELS, QUOTE_SOURCE_LABELS, isQuoteSentExpired } from "@/lib/quotes";
import { Loader2, Plus, RefreshCw } from "lucide-react";
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
    setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
    setSelectedQuote((prev) => (prev && prev.id === quoteId ? { ...prev, status } : prev));
    await supabase.from("quotes").update({ status }).eq("id", quoteId);
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((q) => (
              <SaleCard
                key={q.id}
                quote={q}
                onOpen={() => setSelectedQuote(q)}
                onDelete={(e) => handleDelete(q.id, e)}
                onStatusChange={(status) => handleStatusChange(q.id, status)}
              />
            ))}
          </div>
        )}
      </main>

      <QuoteDetailModal
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        onStatusChange={handleStatusChange}
      />
      <NewSaleModal open={newSaleModalOpen} onClose={() => setNewSaleModalOpen(false)} onCreated={loadAll} />
    </>
  );
}
