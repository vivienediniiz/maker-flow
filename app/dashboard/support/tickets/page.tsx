"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Modal } from "@/components/ui/Modal";
import { TicketThread } from "@/components/support/TicketThread";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, Plus, MessageSquare } from "lucide-react";
import type { SupportTicket, SupportTicketMessage } from "@/lib/types";

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

export default function SupportTicketsPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("open");
  const [loading, setLoading] = useState(true);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

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
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setTickets((data as SupportTicket[]) ?? []);
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

  async function handleCreateTicket() {
    if (!userId || !newSubject.trim() || !newMessage.trim() || creating) return;
    setCreating(true);
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, subject: newSubject.trim() })
      .select()
      .single();

    if (error || !ticket) {
      alert("Não foi possível abrir o chamado. Tente novamente.");
      setCreating(false);
      return;
    }

    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "customer",
      sender_id: userId,
      message: newMessage.trim(),
    });

    setNewTicketOpen(false);
    setNewSubject("");
    setNewMessage("");
    setCreating(false);
    await loadTickets();
    setSelectedId(ticket.id);
  }

  async function handleSendMessage(text: string) {
    if (!userId || !selectedId) return;
    await supabase.from("support_ticket_messages").insert({
      ticket_id: selectedId,
      sender_type: "customer",
      sender_id: userId,
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

  const filteredTickets = filter === "open" ? tickets.filter((t) => t.status === "open") : tickets;
  const selectedTicket = tickets.find((t) => t.id === selectedId) ?? null;

  return (
    <>
      <Topbar title="Meus Chamados" />
      <main className="space-y-6 px-6 py-8 md:px-8">
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
          <NeonButton onClick={() => setNewTicketOpen(true)} size="sm">
            <Plus size={14} /> Novo Chamado
          </NeonButton>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <GlassCard padding="none" className="overflow-hidden">
              {filteredTickets.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-muted">Nenhum chamado por aqui ainda.</p>
              ) : (
                <div className="max-h-[70vh] divide-y divide-border-glass overflow-y-auto scrollbar-glass">
                  {filteredTickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "block w-full px-4 py-3 text-left transition-colors hover:bg-white/[0.03]",
                        selectedId === t.id && "bg-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-text-primary">{t.subject}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-medium",
                            t.status === "open"
                              ? "bg-neon-green/15 text-neon-green"
                              : "bg-white/10 text-text-muted"
                          )}
                        >
                          {t.status === "open" ? "Aberto" : "Fechado"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-muted">Atualizado {relativeTime(t.updated_at)}</p>
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>

            <div className="h-[70vh]">
              {selectedTicket ? (
                <TicketThread
                  ticket={selectedTicket}
                  messages={messages}
                  currentSenderType="customer"
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
      </main>

      <Modal open={newTicketOpen} onClose={() => setNewTicketOpen(false)} title="Novo Chamado">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-text-secondary">Assunto</label>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Ex: Dúvida sobre integração Mercado Pago"
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-secondary">Mensagem</label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Descreva o que está acontecendo..."
              rows={4}
              className="glass-input w-full resize-none"
            />
          </div>
          <NeonButton
            onClick={handleCreateTicket}
            disabled={creating || !newSubject.trim() || !newMessage.trim()}
            className="w-full justify-center"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : "Abrir Chamado"}
          </NeonButton>
        </div>
      </Modal>
    </>
  );
}
