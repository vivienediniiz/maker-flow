"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { GlassCard } from "@/components/ui/GlassCard";
import { QuoteStatusStepper } from "@/components/dashboard/QuoteStatusStepper";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
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

  return (
    <Modal open={!!client} onClose={onClose} title={client.name}>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
        <div className="glass-card space-y-1 p-4 text-sm">
          {client.phone && <p className="text-text-secondary">📱 {client.phone}</p>}
          {client.email && <p className="text-text-secondary">✉️ {client.email}</p>}
          {client.address && <p className="text-text-secondary">📍 {client.address}</p>}
          {client.notes && <p className="text-text-muted">{client.notes}</p>}
          {!client.phone && !client.email && !client.address && !client.notes && (
            <p className="text-text-muted">Sem informações de contato ainda.</p>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
            Orçamentos
          </p>

          {loading ? (
            <div className="flex justify-center py-8 text-text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nenhum orçamento ainda. Gere um pela Calculadora e vincule a este cliente.
            </p>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => (
                <GlassCard key={q.id} padding="md" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{q.project_name}</p>
                    <span className="font-numeric text-sm font-semibold text-neon-pink">
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