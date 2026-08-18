"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { GlassCard } from "@/components/ui/GlassCard";
import { WhatsAppLink } from "@/components/ui/WhatsAppLink";
import { InstagramLink } from "@/components/ui/InstagramLink";
import { QuoteStatusStepper } from "@/components/dashboard/QuoteStatusStepper";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_PILL_STYLES } from "@/lib/quotes";
import { Loader2 } from "lucide-react";
import type { Client, Quote, QuoteStatus } from "@/lib/types";

export function ClientDetailModal({
  client,
  onClose,
}: {
  client: Client | null;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    loadQuotes(client.id);
  }, [client]);

  async function loadQuotes(clientId: string) {
    setLoading(true);
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .eq("client_id", clientId)
      .order("sent_at", { ascending: false });
    setQuotes((data as Quote[]) ?? []);
    setLoading(false);
  }

  async function handleStatusChange(quoteId: string, status: QuoteStatus) {
    setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status } : q)));
    await supabase.from("quotes").update({ status }).eq("id", quoteId);
  }

  if (!client) return null;

  const hasStructuredAddress = !!(client.street || client.city);
  const structuredAddressLine = [
    [client.street, client.number].filter(Boolean).join(", "),
    client.complement,
  ]
    .filter(Boolean)
    .join(" - ");
  const structuredAddressLine2 = [
    client.neighborhood,
    client.city && client.state ? `${client.city} - ${client.state}` : client.city || client.state,
    client.cep,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Modal open={!!client} onClose={onClose} title={client.name}>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
        <div className="glass-card space-y-1 p-4 text-sm">
          {client.phone && (
            <p className="text-text-secondary">
              <WhatsAppLink phone={client.phone} />
            </p>
          )}
          {client.email && <p className="text-text-secondary">✉️ {client.email}</p>}
          {client.instagram && (
            <p className="text-text-secondary">
              <InstagramLink handle={client.instagram} />
            </p>
          )}
          {hasStructuredAddress ? (
            <div className="text-text-secondary">
              <p>📍 {structuredAddressLine}</p>
              {structuredAddressLine2 && <p className="pl-5 text-text-muted">{structuredAddressLine2}</p>}
            </div>
          ) : (
            client.address && <p className="text-text-secondary">📍 {client.address}</p>
          )}
          {client.notes && <p className="text-text-muted">{client.notes}</p>}
          {!client.phone && !client.email && !client.instagram && !client.address && !hasStructuredAddress && !client.notes && (
            <p className="text-text-muted">Sem informações de contato ainda.</p>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Vendas {quotes.length > 0 && <span className="text-text-muted/60">({quotes.length})</span>}
          </p>

          {loading ? (
            <div className="flex justify-center py-8 text-text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nenhuma venda ainda. Gere um orçamento pela Calculadora e vincule a este cliente.
            </p>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <GlassCard key={q.id} padding="md" className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{q.project_name}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-pill border px-2.5 py-1 text-[11px] font-medium",
                        QUOTE_STATUS_PILL_STYLES[q.status]
                      )}
                    >
                      {QUOTE_STATUS_LABELS[q.status]}
                    </span>
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
        </div>
      </div>
    </Modal>
  );
}