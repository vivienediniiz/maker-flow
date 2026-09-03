"use client";

import { useEffect, useState } from "react";
import NextImage from "next/image";
import { FileText, Loader2, Image as ImageIcon, MessageCircle, Link2, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { QuoteStatusStepper } from "@/components/dashboard/QuoteStatusStepper";
import { SaleReceiptModal } from "@/components/dashboard/SaleReceiptModal";
import { ShippingLabelSection } from "@/components/dashboard/ShippingLabelSection";
import { WhatsAppLink, buildWhatsAppLink } from "@/components/ui/WhatsAppLink";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import { formatBRL, cn } from "@/lib/utils";
import {
  formatOrderNumber,
  QUOTE_CHANNEL_LABELS,
  QUOTE_SOURCE_LABELS,
  QUOTE_SOURCE_BADGE_STYLES,
  QUOTE_PAYMENT_METHOD_LABELS,
} from "@/lib/quotes";
import type { QuoteWithClient, QuoteStatus } from "@/lib/types";

export function QuoteDetailModal({
  quote,
  onClose,
  onStatusChange,
  onTrackingCodeChange,
  onShippingUpdate,
}: {
  quote: QuoteWithClient | null;
  onClose: () => void;
  onStatusChange: (quoteId: string, status: QuoteStatus) => void;
  onTrackingCodeChange: (quoteId: string, code: string) => Promise<void>;
  onShippingUpdate: (quoteId: string, patch: Partial<QuoteWithClient>) => void;
}) {
  const confirm = useConfirm();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // O modal fica montado entre trocas de venda selecionada — sincroniza o
  // campo local sempre que a venda (ou o código já salvo nela) mudar.
  useEffect(() => {
    setTrackingCode(quote?.shipping_tracking_code ?? "");
  }, [quote?.id, quote?.shipping_tracking_code]);

  useEffect(() => {
    setPaymentLink(quote?.payment_link_url ?? null);
    setLinkError(null);
    setLinkCopied(false);
  }, [quote?.id, quote?.payment_link_url]);

  if (!quote) return null;

  async function handleSaveTrackingCode() {
    setSavingTracking(true);
    await onTrackingCodeChange(quote!.id, trackingCode.trim());
    setSavingTracking(false);
  }

  function handleSendTrackingWhatsApp() {
    const phone = quote!.clients?.phone;
    if (!phone) return;
    const clientName = quote!.clients?.name ?? quote!.buyer_name ?? "";
    const orderRef = `#${formatOrderNumber(quote!.order_number)}`;
    const text = trackingCode.trim()
      ? `Olá${clientName ? `, ${clientName}` : ""}! Seu pedido ${orderRef} já foi enviado 📦 Código de rastreio: ${trackingCode.trim()}`
      : `Olá${clientName ? `, ${clientName}` : ""}! Seu pedido ${orderRef} já foi enviado 📦`;
    window.open(`${buildWhatsAppLink(phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function handleGeneratePaymentLink() {
    setGeneratingLink(true);
    setLinkError(null);
    try {
      const endpoint =
        quote!.payment_method === "infinitepay"
          ? `/api/quotes/${quote!.id}/infinitepay-link`
          : `/api/quotes/${quote!.id}/payment-link`;
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error ?? "Não foi possível gerar o link.");
        return;
      }
      setPaymentLink(data.url);
    } catch {
      setLinkError("Falha ao gerar o link — tente de novo.");
    } finally {
      setGeneratingLink(false);
    }
  }

  function handleCopyPaymentLink() {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleSendPaymentLinkWhatsApp() {
    const phone = quote!.clients?.phone;
    if (!paymentLink || !phone) return;
    const clientName = quote!.clients?.name ?? quote!.buyer_name ?? "";
    const orderRef = formatOrderNumber(quote!.order_number);
    const text = `Olá${clientName ? `, ${clientName}` : ""}! Segue o link de pagamento da sua compra #${orderRef} (${formatBRL(
      quote!.final_price
    )}): ${paymentLink}`;
    window.open(`${buildWhatsAppLink(phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const hasOwnCalcDetails = quote.weight_g > 0 || quote.print_time_min > 0;
  const linkedProductCalc = quote.products?.calc_inputs ?? null;

  return (
    <Modal open={!!quote} onClose={onClose} title={`Pedido ${formatOrderNumber(quote.order_number)}`}>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
        {/* Origem, se veio de integração */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-pill border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
              QUOTE_SOURCE_BADGE_STYLES[quote.source]
            )}
          >
            {QUOTE_SOURCE_LABELS[quote.source]}
          </span>
          {quote.external_order_id && (
            <span className="font-numeric text-xs text-text-muted">ID: {quote.external_order_id}</span>
          )}
        </div>

        {/* Cliente */}
        <div className="glass-card space-y-1 p-4">
          <p className="text-sm font-medium text-text-primary">
            {quote.clients?.name ?? quote.buyer_name ?? "Cliente não informado"}
          </p>
          {quote.clients?.phone && (
            <p className="text-xs text-text-secondary">
              <WhatsAppLink phone={quote.clients.phone} />
            </p>
          )}
          {quote.clients?.email && <p className="text-xs text-text-secondary">✉️ {quote.clients.email}</p>}
          {quote.clients?.address && <p className="text-xs text-text-secondary">📍 {quote.clients.address}</p>}
        </div>

        {/* Produto vinculado (foto/categoria/descrição), se houver */}
        {quote.products ? (
          <div className="glass-card flex gap-3 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neon-gradient-soft">
              {quote.products.image_url ? (
                <NextImage src={quote.products.image_url} alt="" width={64} height={64} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl">🧩</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{quote.products.name}</p>
              {quote.products.category && <p className="text-xs text-text-muted">{quote.products.category}</p>}
              {quote.products.description && (
                <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{quote.products.description}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{quote.project_name}</p>
        )}

        {quote.is_custom && (
          <div className="rounded-xl border border-neon-pink/30 bg-neon-gradient-soft px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neon-pink">Produto Personalizado</p>
            {quote.customization_notes && (
              <p className="mt-1 text-sm text-text-secondary">{quote.customization_notes}</p>
            )}
          </div>
        )}

        {/* Detalhamento de custo: do próprio pedido, ou do produto vinculado como referência */}
        {hasOwnCalcDetails ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Detalhamento do cálculo</p>
            <Row label="Peso total" value={`${quote.weight_g.toFixed(0)} g`} />
            <Row label="Tempo de impressão" value={`${(quote.print_time_min / 60).toFixed(1)} h`} />
            <Row label="Custo de filamento" value={formatBRL(quote.filament_cost)} />
            <Row label="Custo de energia" value={formatBRL(quote.energy_cost)} />
            <Row label="Margem aplicada" value={`${quote.margin_percent}%`} />
          </div>
        ) : linkedProductCalc ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Detalhamento do produto vinculado <span className="text-text-muted/60">(referência)</span>
            </p>
            <Row
              label="Peso total"
              value={`${linkedProductCalc.beds.reduce((s, b) => s + b.weightG, 0).toFixed(0)} g`}
            />
            <Row
              label="Tempo de impressão"
              value={`${linkedProductCalc.beds.reduce((s, b) => s + b.timeH + b.timeM / 60, 0).toFixed(1)} h`}
            />
            {linkedProductCalc.filamentPricePerKg != null && (
              <Row label="Filamento (R$/kg)" value={formatBRL(linkedProductCalc.filamentPricePerKg)} />
            )}
            <Row label="Margem aplicada" value={`${linkedProductCalc.marginPercent}%`} />
          </div>
        ) : (
          <p className="text-xs text-text-muted">Este pedido não tem detalhamento de cálculo salvo.</p>
        )}

        {quote.platform_fee > 0 || quote.cost_amount > 0 ? (
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-3 text-center">
            <div>
              <p className="text-[10px] text-text-muted">Bruto</p>
              <p className="font-numeric text-base font-medium text-text-primary">{formatBRL(quote.final_price)}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Custos</p>
              <p className="font-numeric text-base font-medium text-red-400">
                {formatBRL(quote.platform_fee + quote.cost_amount)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Líquido</p>
              <p className="font-numeric text-base font-medium text-neon-green">{formatBRL(quote.net_amount)}</p>
            </div>
          </div>
        ) : (
          <div className="glass-card flex items-center justify-between px-4 py-3">
            <span className="text-xs text-text-muted">Valor final</span>
            <span className="font-numeric text-lg font-semibold text-neon-pink">{formatBRL(quote.final_price)}</span>
          </div>
        )}

        <div className="space-y-1 text-xs text-text-muted">
          {quote.payment_method && (
            <p>Forma de pagamento: <span className="text-text-secondary">{QUOTE_PAYMENT_METHOD_LABELS[quote.payment_method]}</span></p>
          )}
          {quote.channel && (
            <p>Canal de venda: <span className="text-text-secondary">{QUOTE_CHANNEL_LABELS[quote.channel]}</span></p>
          )}
          {quote.shipping_cost != null && (
            <p>Frete: <span className="text-text-secondary">{formatBRL(quote.shipping_cost)}</span></p>
          )}
        </div>

        {quote.status !== "cancelled" && quote.status !== "expired" && (
          <ShippingLabelSection quote={quote} onUpdate={(patch) => onShippingUpdate(quote.id, patch)} />
        )}

        {/* Documentos */}
        <div className="grid grid-cols-2 gap-2">
          <NeonButton variant="outline" size="sm" onClick={() => setReceiptOpen(true)}>
            <ImageIcon size={14} /> Gerar Comprovante
          </NeonButton>
          <NeonButton
            variant="ghost"
            size="sm"
            disabled
            className="opacity-40"
            title="Em breve — precisa de um provedor fiscal"
          >
            <FileText size={14} /> Emitir NF
          </NeonButton>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Status do pedido</p>
          <QuoteStatusStepper
            status={quote.status}
            sentAt={quote.sent_at}
            onChange={(status) => onStatusChange(quote.id, status)}
          />
        </div>

        {quote.status === "awaiting_payment" && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Cobrança</p>
            {paymentLink ? (
              <>
                <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2">
                  <Link2 size={13} className="shrink-0 text-text-muted" />
                  <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{paymentLink}</span>
                  <button
                    type="button"
                    onClick={handleCopyPaymentLink}
                    className={`flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      linkCopied ? "text-neon-green" : "text-neon-pink hover:bg-white/5"
                    }`}
                  >
                    {linkCopied ? <Check size={12} /> : <Copy size={12} />} {linkCopied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                {quote.clients?.phone ? (
                  <NeonButton type="button" size="sm" className="w-full" onClick={handleSendPaymentLinkWhatsApp}>
                    <MessageCircle size={14} /> Enviar Link de Cobrança
                  </NeonButton>
                ) : (
                  <p className="text-[11px] text-text-muted">Cliente sem WhatsApp cadastrado.</p>
                )}
              </>
            ) : (
              <NeonButton
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleGeneratePaymentLink}
                disabled={generatingLink}
              >
                {generatingLink ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                {generatingLink ? "Gerando..." : "Gerar Link de Cobrança"}
              </NeonButton>
            )}
            {linkError && <p className="text-[11px] text-red-400">{linkError}</p>}
          </div>
        )}

        {quote.status === "shipped" && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Rastreio do Pedido</p>
            <div className="flex gap-2">
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Código ou link de rastreio"
                className="glass-input flex-1"
              />
              <NeonButton
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveTrackingCode}
                disabled={savingTracking || trackingCode.trim() === (quote.shipping_tracking_code ?? "")}
              >
                {savingTracking ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
              </NeonButton>
            </div>
            {quote.clients?.phone ? (
              <NeonButton type="button" className="w-full" onClick={handleSendTrackingWhatsApp}>
                <MessageCircle size={14} /> Enviar Rastreio no WhatsApp
              </NeonButton>
            ) : (
              <p className="text-[11px] text-text-muted">Cliente sem WhatsApp cadastrado.</p>
            )}
          </div>
        )}

        {quote.status !== "cancelled" && quote.status !== "expired" && (
          <button
            type="button"
            onClick={async () => {
              if (await confirm("Cancelar esta venda? Ela vai contar como venda cancelada no Financeiro.")) {
                onStatusChange(quote.id, "cancelled");
              }
            }}
            className="w-full rounded-xl border border-red-500/30 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
          >
            Cancelar Venda
          </button>
        )}
      </div>

      <SaleReceiptModal quote={quote} open={receiptOpen} onClose={() => setReceiptOpen(false)} zIndexClass="z-[60]" />
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-text-secondary">
      <span>{label}</span>
      <span className="font-numeric text-text-primary">{value}</span>
    </div>
  );
}