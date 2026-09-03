"use client";

import { useEffect, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { cn } from "@/lib/utils";
import { Lock, Send, Unlock } from "lucide-react";
import type { SupportSenderType, SupportTicket, SupportTicketMessage } from "@/lib/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

interface TicketThreadProps {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
  /** Quem está operando esta tela agora — define de que lado as bolhas próprias aparecem e com que sender_type a mensagem é enviada. */
  currentSenderType: SupportSenderType;
  /** Só o painel admin preenche — mostra de quem é o chamado. */
  customerLabel?: string;
  onSendMessage: (message: string) => Promise<void>;
  onToggleStatus: () => Promise<void>;
}

export function TicketThread({
  ticket,
  messages,
  currentSenderType,
  customerLabel,
  onSendMessage,
  onToggleStatus,
}: TicketThreadProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, ticket.id]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSendMessage(text);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  async function handleToggleStatus() {
    setTogglingStatus(true);
    try {
      await onToggleStatus();
    } finally {
      setTogglingStatus(false);
    }
  }

  const isOpen = ticket.status === "open";

  return (
    <GlassCard padding="none" className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-glass px-5 py-4">
        <div className="min-w-0">
          {customerLabel && <p className="truncate text-xs text-text-muted">{customerLabel}</p>}
          <p className="truncate font-display text-base">{ticket.subject}</p>
        </div>
        <button
          onClick={handleToggleStatus}
          disabled={togglingStatus}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
            isOpen
              ? "border-neon-green/30 bg-neon-green/10 text-neon-green hover:bg-neon-green/20"
              : "border-white/10 bg-white/5 text-text-secondary hover:bg-white/10"
          )}
        >
          {isOpen ? <Lock size={12} /> : <Unlock size={12} />}
          {isOpen ? "Marcar como Fechado" : "Reabrir Chamado"}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-glass px-5 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">Nenhuma mensagem ainda.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_type === currentSenderType;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    mine ? "bg-neon-gradient text-white" : "bg-white/[0.06] text-text-primary"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-text-muted")}>
                    {m.sender_type === "admin" ? "Suporte" : "Você"} · {formatDateTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border-glass p-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escreva uma mensagem..."
          rows={1}
          className="glass-input flex-1 resize-none"
        />
        <NeonButton onClick={handleSend} disabled={sending || !draft.trim()} size="sm">
          <Send size={14} />
        </NeonButton>
      </div>
    </GlassCard>
  );
}
