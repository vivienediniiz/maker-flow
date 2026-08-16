"use client";

import { useState } from "react";
import { FileText, Truck, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { QuoteStatusStepper } from "@/components/dashboard/QuoteStatusStepper";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { formatOrderNumber, QUOTE_CHANNEL_LABELS, QUOTE_SOURCE_LABELS, QUOTE_SOURCE_BADGE_STYLES } from "@/lib/quotes";
import type { QuoteWithClient, QuoteStatus, QuotePaymentMethod } from "@/lib/types";

const PAYMENT_METHOD_LABELS: Record<QuotePaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  cash: "Dinheiro",
  transfer: "Transferência",
  other: "Outro",
};

export function QuoteDetailModal({
  quote,
  onClose,
  onStatusChange,
}: {
  quote: QuoteWithClient | null;
  onClose: () => void;
  onStatusChange: (quoteId: string, status: QuoteStatus) => void;
}) {
  const supabase = createClient();
  const [generatingLabel, setGeneratingLabel] = useState(false);

  if (!quote) return null;

  const hasOwnCalcDetails = quote.weight_g > 0 || quote.print_time_min > 0;
  const linkedProductCalc = quote.products?.calc_inputs ?? null;

  async function handlePrintShippingDocument() {
    setGeneratingLabel(true);

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("studio_name, full_name, phone").eq("id", user!.id).single(),
      supabase.from("settings").select("origin_cep, origin_address").eq("user_id", user!.id).single(),
    ]);

    const container = document.createElement("div");
    container.style.width = "600px";
    container.style.padding = "32px";
    container.style.fontFamily = "'Segoe UI', Arial, sans-serif";
    container.style.background = "#FFFFFF";
    container.style.color = "#1A1625";

    container.innerHTML = `
      <div style="border-bottom:3px solid #FF4EDF; padding-bottom:12px; margin-bottom:20px;">
        <p style="margin:0; font-size:18px; font-weight:700;">Documento de Envio</p>
        <p style="margin:2px 0 0; font-size:11px; color:#726C85;">Pedido ${formatOrderNumber(quote!.order_number)}</p>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
        <div style="border:1px solid #EEE6F2; border-radius:10px; padding:14px;">
          <p style="margin:0 0 8px; font-size:11px; font-weight:700; color:#AA17DB;">REMETENTE</p>
          <p style="margin:0; font-size:13px; font-weight:600;">${profile?.studio_name || profile?.full_name || "Meu Estúdio"}</p>
          <p style="margin:4px 0 0; font-size:12px; color:#3A3548;">${settings?.origin_address || "Endereço não cadastrado"}</p>
          <p style="margin:2px 0 0; font-size:12px; color:#3A3548;">CEP: ${settings?.origin_cep || "—"}</p>
          ${profile?.phone ? `<p style="margin:2px 0 0; font-size:12px; color:#3A3548;">${profile.phone}</p>` : ""}
        </div>
        <div style="border:1px solid #EEE6F2; border-radius:10px; padding:14px;">
          <p style="margin:0 0 8px; font-size:11px; font-weight:700; color:#AA17DB;">DESTINATÁRIO</p>
          <p style="margin:0; font-size:13px; font-weight:600;">${quote!.clients?.name ?? "Cliente não informado"}</p>
          <p style="margin:4px 0 0; font-size:12px; color:#3A3548;">${quote!.clients?.address || "Endereço não cadastrado"}</p>
          <p style="margin:2px 0 0; font-size:12px; color:#3A3548;">CEP: ${quote!.destination_cep || "—"}</p>
          ${quote!.clients?.phone ? `<p style="margin:2px 0 0; font-size:12px; color:#3A3548;">${quote!.clients.phone}</p>` : ""}
        </div>
      </div>

      <div style="margin-top:20px; border:1px solid #EEE6F2; border-radius:10px; padding:14px; font-size:12px;">
        <p style="margin:0 0 4px;"><strong>Produto:</strong> ${quote!.project_name}</p>
        ${quote!.weight_g > 0 ? `<p style="margin:0 0 4px;"><strong>Peso:</strong> ${quote!.weight_g.toFixed(0)} g</p>` : ""}
        ${quote!.shipping_cost ? `<p style="margin:0;"><strong>Valor do frete:</strong> ${formatBRL(quote!.shipping_cost)}</p>` : ""}
      </div>

      <p style="text-align:center; font-size:9px; color:#B4AFC4; margin-top:24px;">Gerado via MakerFlow</p>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#FFFFFF" });
      const imgData = canvas.toDataURL("image/png");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      doc.save(`envio-pedido-${formatOrderNumber(quote!.order_number)}.pdf`);
    } finally {
      document.body.removeChild(container);
      setGeneratingLabel(false);
    }
  }

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
          {quote.clients?.phone && <p className="text-xs text-text-secondary">📱 {quote.clients.phone}</p>}
          {quote.clients?.email && <p className="text-xs text-text-secondary">✉️ {quote.clients.email}</p>}
          {quote.clients?.address && <p className="text-xs text-text-secondary">📍 {quote.clients.address}</p>}
        </div>

        {/* Produto vinculado (foto/categoria/descrição), se houver */}
        {quote.products ? (
          <div className="glass-card flex gap-3 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neon-gradient-soft">
              {quote.products.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={quote.products.image_url} alt="" className="h-full w-full object-cover" />
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
            <Row label="Filamento (R$/kg)" value={formatBRL(linkedProductCalc.filamentPricePerKg)} />
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
            <p>Forma de pagamento: <span className="text-text-secondary">{PAYMENT_METHOD_LABELS[quote.payment_method]}</span></p>
          )}
          {quote.channel && (
            <p>Canal de venda: <span className="text-text-secondary">{QUOTE_CHANNEL_LABELS[quote.channel]}</span></p>
          )}
          {quote.shipping_cost != null && (
            <p>Frete: <span className="text-text-secondary">{formatBRL(quote.shipping_cost)}</span></p>
          )}
        </div>

        {/* Documentos */}
        <div className="grid grid-cols-2 gap-2">
          <NeonButton variant="outline" size="sm" onClick={handlePrintShippingDocument} disabled={generatingLabel}>
            {generatingLabel ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
            Doc. de Envio
          </NeonButton>
          <NeonButton variant="ghost" size="sm" disabled className="opacity-40" title="Em breve — precisa de um provedor fiscal">
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
      </div>
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