"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TicketThread } from "@/components/support/TicketThread";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquare, Search, AlertCircle } from "lucide-react";
import type { SupportTicketAdminView, SupportTicketMessage } from "@/lib/types";

const FILTERS: { key: "open" | "all"; label: string }[] = [
  { key: "open", label: "Abertos" },
  { key: "all", label: "Todos" },
];

function relativeTime(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export default function AdminSupportPage() {
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicketAdminView[]>([]);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId]);

  async function loadTickets() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setAdminId(user.id);

    const { data } = await supabase
      .from("support_tickets_admin_view")
      .select("*")
      .order("updated_at", { ascending: false });

    // Prioriza quem está esperando resposta há mais tempo: último autor =
    // cliente sobe pro topo, dentro disso ordenado por updated_at desc.
    const sorted = ((data as SupportTicketAdminView[]) ?? []).sort((a, b) => {
      const aWaiting = a.last_sender_type === "customer" ? 1 : 0;
      const bWaiting = b.last_sender_type === "customer" ? 1 : 0;
      if (aWaiting !== bWaiting) return bWaiting - aWaiting;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    setTickets(sorted);
    setLoading(false);
  }

  async function loadMessages(ticketId: string) {
    const { data } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages((data as SupportTicketMessage[]) ?? []);
  }

  async function handleSendMessage(text: string) {
    if (!adminId || !selectedId) return;
    await supabase.from("support_ticket_messages").insert({
      ticket_id: selectedId,
      sender_type: "admin",
      sender_id: adminId,
      message: text,
    });
    await Promise.all([loadMessages(selectedId), loadTickets()]);
  }

  async function handleToggleStatus() {
    if (!selectedId) return;
    const ticket = tickets.find((t) => t.id === selectedId);
    if (!ticket) return;
    const nextStatus = ticket.status === "open" ? "closed" : "open";
    await supabase.from("support_tickets").update({ status: nextStatus }).eq("id", selectedId);
    await loadTickets();
  }

  const filteredTickets = useMemo(() => {
    let list = filter === "open" ? tickets.filter((t) => t.status === "open") : tickets;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.subject.toLowerCase().includes(q) || (t.customer_name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, filter, search]);

  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="glass-card flex gap-1 p-1">
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
        <div className="relative w-full max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou assunto..."
            className="glass-input w-full pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <GlassCard padding="none" className="overflow-hidden">
            {filteredTickets.length === 0 ? (
              <p className="p-6 text-center text-sm text-text-muted">Nenhum chamado encontrado.</p>
            ) : (
              <div className="max-h-[70vh] divide-y divide-border-glass overflow-y-auto scrollbar-glass">
                {filteredTickets.map((t) => {
                  const waiting = t.last_sender_type === "customer";
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "block w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03]",
                        selectedId === t.id && "bg-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">{t.customer_name || t.customer_email}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-medium",
                            t.status === "open" ? "bg-neon-green/15 text-neon-green" : "bg-white/10 text-text-muted"
                          )}
                        >
                          {t.status === "open" ? "Aberto" : "Fechado"}
                        </span>
                      </div>
                      <p className="truncate text-xs text-text-secondary">{t.subject}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {waiting && t.status === "open" && (
                          <span className="flex items-center gap-1 rounded-pill bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                            <AlertCircle size={10} /> Aguardando resposta
                          </span>
                        )}
                        <p className="text-[10px] text-text-muted">
                          {t.last_message_at ? relativeTime(t.last_message_at) : relativeTime(t.updated_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <div className="h-[70vh]">
            {selectedTicket ? (
              <TicketThread
                ticket={selectedTicket}
                messages={messages}
                currentSenderType="admin"
                customerLabel={`Chamado de ${selectedTicket.customer_name || selectedTicket.customer_email}`}
                onSendMessage={handleSendMessage}
                onToggleStatus={handleToggleStatus}
              />
            ) : (
              <GlassCard padding="lg" className="flex h-full flex-col items-center justify-center gap-3 text-center text-text-muted">
                <MessageSquare size={28} />
                <p className="text-sm">Selecione um chamado pra ver a conversa.</p>
              </GlassCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
