"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { getCyclePricing, planDisplayLabel, type PlanTier, type BillingCycle } from "@/lib/plans";
import { Loader2, Copy, Check, Ban, RefreshCw, Wallet, Mail, StickyNote } from "lucide-react";
import type { AdminSubscriberRow, SubscriptionEvent } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
  inactive: "Inativo",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-neon-green/15 text-neon-green border-neon-green/30",
  paused: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  inactive: "bg-white/10 text-text-secondary border-white/10",
};

function monthlyValue(row: AdminSubscriberRow): string {
  if (row.subscription_tier === "free") return "—";
  const pricing = getCyclePricing(row.subscription_tier as PlanTier, (row.billing_cycle as BillingCycle) ?? "monthly");
  return pricing.frequencyMonths === 1 ? `${formatBRL(pricing.price)}/mês` : `${formatBRL(pricing.price)}/ano`;
}

/** Ações que mexem em cobrança de verdade (cancelar/suspender/reembolsar/renovar) ainda não estão
 * ligadas à API do Mercado Pago — fazer isso só no nosso banco criaria uma divergência perigosa
 * (o app mostraria "cancelado" enquanto o cartão do assinante continuaria sendo cobrado de verdade).
 * Ficam desabilitadas até esse fluxo ser construído com cuidado. */
const BILLING_ACTIONS_DISABLED_REASON = "Ainda não conectado à API do Mercado Pago — em breve";

export function SubscriberDetailModal({
  subscriber,
  onClose,
}: {
  subscriber: AdminSubscriberRow | null;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [events, setEvents] = useState<SubscriptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!subscriber) return;
    loadEvents(subscriber.user_id);
  }, [subscriber?.user_id]);

  async function loadEvents(userId: string) {
    setLoading(true);
    const { data } = await supabase
      .from("subscription_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setEvents((data as SubscriptionEvent[]) ?? []);
    setLoading(false);
  }

  function handleCopyEmail() {
    if (!subscriber) return;
    navigator.clipboard.writeText(subscriber.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!subscriber) return null;

  const daysOnPlatform = Math.floor((Date.now() - new Date(subscriber.created_at).getTime()) / 86400000);

  return (
    <Modal open={!!subscriber} onClose={onClose} title={subscriber.full_name || subscriber.email} maxWidthClass="max-w-lg">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-pill border px-2.5 py-1 text-[11px] font-medium", STATUS_STYLES[subscriber.subscription_status])}>
            {STATUS_LABELS[subscriber.subscription_status]}
          </span>
          <span className="rounded-pill border border-border-glass px-2.5 py-1 text-[11px] text-text-secondary">
            {planDisplayLabel(subscriber.subscription_tier)}
          </span>
          {subscriber.payment_method && (
            <span className="rounded-pill border border-border-glass px-2.5 py-1 text-[11px] text-text-secondary">
              {subscriber.payment_method === "card" ? "Cartão automático" : "Pix manual"}
            </span>
          )}
        </div>

        <div className="glass-card grid grid-cols-2 gap-3 p-4 text-sm">
          <Row label="E-mail" value={subscriber.email} />
          <Row label="Telefone" value={subscriber.phone ?? "—"} />
          <Row label="Estúdio" value={subscriber.studio_name ?? "—"} />
          <Row label="Cadastrado em" value={new Date(subscriber.created_at).toLocaleDateString("pt-BR")} />
          <Row label="Dias na plataforma" value={`${daysOnPlatform}d`} />
          <Row
            label="Assinante desde"
            value={subscriber.first_payment_confirmed_at ? new Date(subscriber.first_payment_confirmed_at).toLocaleDateString("pt-BR") : "Nunca pagou"}
          />
          <Row label="Valor" value={monthlyValue(subscriber)} />
          <Row
            label="Próximo ciclo"
            value={
              subscriber.payment_method === "pix" && subscriber.paid_until
                ? new Date(subscriber.paid_until).toLocaleDateString("pt-BR")
                : subscriber.payment_method === "card"
                  ? "Gerenciado pelo Mercado Pago"
                  : "—"
            }
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
            Histórico de status ({events.length})
          </p>
          {loading ? (
            <div className="flex justify-center py-4 text-text-muted">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-text-muted">Nenhum evento registrado ainda (rastreamento começou em 26/08/2026).</p>
          ) : (
            <div className="space-y-1.5">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border-glass bg-white/[0.02] px-3 py-2 text-xs">
                  <span className="text-text-secondary">
                    {e.from_status ?? "—"} → <span className="text-text-primary">{e.to_status}</span>
                    {e.from_tier !== e.to_tier && <span className="text-text-muted"> ({e.from_tier ?? "—"} → {e.to_tier})</span>}
                  </span>
                  <span className="shrink-0 text-text-muted">{new Date(e.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Ações</p>
          <div className="grid grid-cols-2 gap-2">
            <NeonButton type="button" variant="outline" size="sm" onClick={handleCopyEmail}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado" : "Copiar e-mail"}
            </NeonButton>
            <NeonButton type="button" variant="ghost" size="sm" disabled className="opacity-40" title={BILLING_ACTIONS_DISABLED_REASON}>
              <Mail size={13} /> Enviar E-mail
            </NeonButton>
            <NeonButton type="button" variant="ghost" size="sm" disabled className="opacity-40" title={BILLING_ACTIONS_DISABLED_REASON}>
              <RefreshCw size={13} /> Renovar Manualmente
            </NeonButton>
            <NeonButton type="button" variant="ghost" size="sm" disabled className="opacity-40" title={BILLING_ACTIONS_DISABLED_REASON}>
              <Wallet size={13} /> Reembolsar
            </NeonButton>
            <NeonButton type="button" variant="ghost" size="sm" disabled className="opacity-40" title={BILLING_ACTIONS_DISABLED_REASON}>
              <StickyNote size={13} /> Adicionar Nota
            </NeonButton>
            <NeonButton type="button" variant="danger" size="sm" disabled className="opacity-40" title={BILLING_ACTIONS_DISABLED_REASON}>
              <Ban size={13} /> Cancelar Assinatura
            </NeonButton>
          </div>
          <p className="mt-2 text-[11px] text-text-muted">
            Ações de cobrança (cancelar, suspender, reembolsar, renovar) ainda não chamam a API real do Mercado
            Pago — fazer isso só no banco criaria divergência com a cobrança de verdade. Ficam desabilitadas até
            esse fluxo ser construído.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className="truncate text-text-primary">{value}</p>
    </div>
  );
}
