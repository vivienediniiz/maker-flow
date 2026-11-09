"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildWhatsAppLink } from "@/components/ui/WhatsAppLink";
import { formatBRL } from "@/lib/utils";
import { CheckCircle2, Clock, Copy, Check, Loader2, MessageCircle, MapPin, XCircle } from "lucide-react";
import type { StoreProductPublic } from "@/lib/types";

export interface OrderSummary {
  id: string;
  status: string;
  items: { product_id: string; name: string; unit_price: number; quantity: number; customization?: string | null }[];
  total_amount: number;
  payment_provider?: "mercado_pago" | "infinitepay" | "pix_direto";
  /** 0..3 = etapa atual; "cancelled" quando a venda foi cancelada/expirou. */
  stage?: number | "cancelled";
  steps?: string[];
  subtotal?: number;
  discount_amount?: number;
  shipping_amount?: number;
  delivery?: { method: "pickup" | "arrange" | "shipping"; label: string | null; note: string | null } | null;
  pix_payload?: string | null;
}

interface OrderTrackingProps {
  summary: OrderSummary | null;
  loading: boolean;
  products: StoreProductPublic[];
  primaryColor: string;
  titleColor: string;
  titleFontFamily: string;
  subtitleFontFamily: string;
  defaultProductionMessage: string | null;
  whatsappNumber: string | null;
}

/**
 * Painel do pedido na loja: aviso de Pix pra pagar (QR + Copia e Cola),
 * etapas do acompanhamento, itens, valores e entrega. Serve tanto pra tela
 * "pedido confirmado" quanto pro link de acompanhamento que o cliente guarda.
 */
export function OrderTracking({
  summary,
  loading,
  products,
  primaryColor,
  titleColor,
  titleFontFamily,
  subtitleFontFamily,
  defaultProductionMessage,
  whatsappNumber,
}: OrderTrackingProps) {
  if (loading) {
    return (
      <div className="mb-8 flex items-center gap-2.5 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-white/70">
        <Loader2 size={15} className="animate-spin" /> Carregando resumo do pedido...
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mb-8 flex items-center gap-2.5 rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-3 text-sm text-neon-green">
        <CheckCircle2 size={16} /> Pedido recebido — obrigado pela compra!
      </div>
    );
  }

  const cancelled = summary.stage === "cancelled";
  const stage = typeof summary.stage === "number" ? summary.stage : 0;
  const awaitingPix = !!summary.pix_payload;
  const shortId = summary.id.slice(0, 8);
  const subtotal = summary.subtotal ?? summary.total_amount;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl bg-white/[0.06]">
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ backgroundColor: cancelled ? "#7f1d1d" : primaryColor }}>
        {cancelled ? <XCircle size={18} className="text-white" /> : awaitingPix ? <Clock size={18} className="text-white" /> : <CheckCircle2 size={18} className="text-white" />}
        <p style={{ fontFamily: titleFontFamily }} className="text-white">
          {cancelled ? "Pedido cancelado" : awaitingPix ? "Falta pagar com Pix" : "Pedido confirmado!"}
        </p>
      </div>

      <div className="space-y-4 p-5">
        {awaitingPix && summary.pix_payload && <PixPayment payload={summary.pix_payload} amount={summary.total_amount} orderId={summary.id} />}

        {!cancelled && summary.steps && (
          <ol className="grid grid-cols-4 gap-1.5">
            {summary.steps.map((label, index) => {
              const done = index < stage || (index === stage && stage > 0);
              const current = index === stage;
              return (
                <li key={label} className="text-center">
                  <div
                    className="mx-auto mb-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: done || current ? primaryColor : "rgba(255,255,255,0.12)", opacity: current && !done ? 0.55 : 1 }}
                  />
                  <p className={`text-[10px] leading-tight ${done || current ? "text-white" : "text-white/40"}`}>{label}</p>
                </li>
              );
            })}
          </ol>
        )}

        <div className="space-y-3">
          {summary.items.map((item, idx) => {
            const product = products.find((p) => p.id === item.product_id);
            const days = product?.estimated_production_days;
            const productionText = days != null ? `Pronto em até ${days} dia${days === 1 ? " útil" : "s úteis"}` : defaultProductionMessage;
            return (
              <div key={idx} className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p style={{ fontFamily: titleFontFamily, color: titleColor }} className="text-sm">
                    {item.quantity}x {item.name}
                  </p>
                  {item.customization && <p className="mt-0.5 text-xs text-white/60">&quot;{item.customization}&quot;</p>}
                  {productionText && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/50">
                      <Clock size={11} /> {productionText}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm text-white/85">{formatBRL(item.unit_price * item.quantity)}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 border-t border-white/10 pt-3 text-sm">
          {((summary.discount_amount ?? 0) > 0 || (summary.shipping_amount ?? 0) > 0) && (
            <div className="flex items-center justify-between text-white/60">
              <span>Produtos</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
          )}
          {(summary.discount_amount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-neon-green">
              <span>Desconto no Pix</span>
              <span>- {formatBRL(summary.discount_amount ?? 0)}</span>
            </div>
          )}
          {summary.delivery && (
            <div className="flex items-center justify-between text-white/60">
              <span>{summary.delivery.label}</span>
              <span>{(summary.shipping_amount ?? 0) > 0 ? formatBRL(summary.shipping_amount ?? 0) : "Grátis"}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-white/70">Total</span>
            <span className="text-lg font-semibold" style={{ color: primaryColor }}>
              {formatBRL(summary.total_amount)}
            </span>
          </div>
        </div>

        {summary.delivery?.note && (
          <p className="flex items-start gap-1.5 text-xs text-white/60">
            <MapPin size={12} className="mt-0.5 shrink-0" /> {summary.delivery.note}
          </p>
        )}

        <p style={{ fontFamily: subtitleFontFamily }} className="text-xs text-white/50">
          Guarde esta página: ela mostra cada etapa do seu pedido {shortId}. Basta abrir o mesmo link de novo.
        </p>
        {whatsappNumber && (
          <a
            href={buildWhatsAppLink(whatsappNumber, `Olá! Tenho uma dúvida sobre o pedido ${shortId}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/85 hover:text-white"
          >
            <MessageCircle size={13} /> Tirar dúvida sobre esse pedido
          </a>
        )}
      </div>
    </div>
  );
}

function PixPayment({ payload, amount, orderId }: { payload: string; amount: number; orderId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, { margin: 1, width: 240, errorCorrectionLevel: "M" })
      .then((url) => active && setQr(url))
      .catch(() => active && setQr(null));
    return () => {
      active = false;
    };
  }, [payload]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard bloqueado: o cliente ainda pode selecionar o texto abaixo
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 text-center">
      <p className="text-sm text-white/80">
        Pague <strong className="text-white">{formatBRL(amount)}</strong> pelo Pix. Seu pedido {orderId.slice(0, 8)} é
        confirmado assim que o pagamento for conferido.
      </p>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="QR Code do Pix" width={200} height={200} className="mx-auto rounded-lg bg-white p-2" />
      ) : (
        <div className="mx-auto flex h-[200px] w-[200px] items-center justify-center text-white/40">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
      <p className="break-all rounded-lg bg-white/5 px-3 py-2 text-left text-[11px] text-white/60" aria-label="Pix Copia e Cola">
        {payload}
      </p>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/15"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Código copiado" : "Copiar Pix Copia e Cola"}
      </button>
    </div>
  );
}
