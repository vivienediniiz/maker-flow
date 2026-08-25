"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { formatOrderNumber, QUOTE_PAYMENT_METHOD_LABELS } from "@/lib/quotes";
import { buildWhatsAppLink } from "@/components/ui/WhatsAppLink";
import type { QuoteWithClient } from "@/lib/types";

interface ReceiptProfile {
  studio_name: string | null;
  instagram: string | null;
  website: string | null;
  avatar_url: string | null;
}

interface ReceiptAppearance {
  accentColor: string;
  footerMessage: string | null;
  showProductionDeadline: boolean;
}

interface SaleReceiptModalProps {
  quote: QuoteWithClient | null;
  open: boolean;
  onClose: () => void;
  zIndexClass?: string;
}

export function SaleReceiptModal({ quote, open, onClose, zIndexClass }: SaleReceiptModalProps) {
  const supabase = createClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsAppStatus, setWhatsAppStatus] = useState<"idle" | "opened" | "blocked">("idle");
  const generatedForQuoteId = useRef<string | null>(null);

  const clientPhone = quote?.clients?.phone || null;

  useEffect(() => {
    if (!open || !quote) return;
    if (generatedForQuoteId.current === quote.id) return;
    generateReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quote?.id]);

  useEffect(() => {
    if (open) return;
    // Ao fechar, descarta o resultado — reabrir gera de novo, já que os
    // dados da venda podem ter mudado nesse meio-tempo.
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setBlob(null);
    setError(null);
    setWhatsAppStatus("idle");
    generatedForQuoteId.current = null;
  }, [open]);

  async function generateReceipt() {
    if (!quote) return;
    setGenerating(true);
    setError(null);

    let container: HTMLDivElement | null = null;

    try {
      const { default: html2canvas } = await import("html2canvas");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("studio_name, instagram, website, avatar_url").eq("id", user!.id).single(),
        supabase
          .from("settings")
          .select("pdf_accent_color, pdf_footer_message, pdf_show_production_deadline")
          .eq("user_id", user!.id)
          .single(),
      ]);

      const appearance: ReceiptAppearance = {
        accentColor: settings?.pdf_accent_color || "#FF4EDF",
        footerMessage: settings?.pdf_footer_message ?? null,
        showProductionDeadline: settings?.pdf_show_production_deadline ?? true,
      };

      container = buildReceiptContainer(quote, profile as ReceiptProfile | null, appearance);
      document.body.appendChild(container);

      await document.fonts.ready;

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0B0914",
        width: 1080,
        height: 1350,
      });

      const generatedBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!generatedBlob) throw new Error("toBlob retornou vazio");

      setBlob(generatedBlob);
      setImageUrl(URL.createObjectURL(generatedBlob));
      generatedForQuoteId.current = quote.id;
    } catch (err) {
      console.error("Falha ao gerar comprovante:", err);
      setError("Não foi possível gerar o comprovante. Tente novamente.");
    } finally {
      if (container) document.body.removeChild(container);
      setGenerating(false);
    }
  }

  function downloadBlob(fileBlob: Blob, forQuote: QuoteWithClient) {
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprovante-venda-${formatOrderNumber(forQuote.order_number)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleDownload() {
    if (!blob || !quote) return;
    downloadBlob(blob, quote);
  }

  /**
   * WhatsApp não tem API pública pra anexar arquivo via link — só o texto vem
   * pré-preenchido (`wa.me`). Por isso "Compartilhar no WhatsApp" já baixa a
   * imagem junto: o estúdio só precisa anexar o arquivo que já caiu nos
   * downloads na conversa que abriu.
   */
  function sendToWhatsApp(phone: string, forQuote: QuoteWithClient) {
    const clientName = forQuote.clients?.name ?? forQuote.buyer_name ?? "";
    const text = encodeURIComponent(
      `Olá${clientName ? `, ${clientName}` : ""}! Segue o comprovante da sua compra #${formatOrderNumber(
        forQuote.order_number
      )} 🎉`
    );
    const win = window.open(`${buildWhatsAppLink(phone)}?text=${text}`, "_blank");
    setWhatsAppStatus(win ? "opened" : "blocked");
  }

  function handleShareWhatsApp() {
    if (!clientPhone || !quote) return;
    if (blob) downloadBlob(blob, quote);
    sendToWhatsApp(clientPhone, quote);
  }

  if (!quote) return null;

  return (
    <Modal open={open} onClose={onClose} title="Comprovante de Venda" zIndexClass={zIndexClass} maxWidthClass="max-w-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-2xl border border-border-glass bg-black/20">
          {generating ? (
            <Loader2 className="animate-spin text-text-muted" size={28} />
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Comprovante de venda" className="h-full w-full object-contain" />
          ) : (
            <p className="px-6 text-center text-xs text-text-muted">{error ?? "Preparando comprovante..."}</p>
          )}
        </div>

        {error && !generating && (
          <NeonButton variant="outline" size="sm" onClick={generateReceipt}>
            Tentar novamente
          </NeonButton>
        )}

        {whatsAppStatus === "opened" && (
          <p className="text-center text-xs text-neon-green">
            Comprovante baixado e WhatsApp do cliente aberto — é só anexar a imagem na conversa.
          </p>
        )}
        {whatsAppStatus === "blocked" && (
          <p className="text-center text-xs text-amber-400">
            O navegador bloqueou a aba do WhatsApp — tente o botão de novo.
          </p>
        )}
        {!clientPhone && !generating && blob && (
          <p className="text-center text-xs text-text-muted">
            Cliente sem WhatsApp cadastrado — só dá pra salvar o comprovante.
          </p>
        )}

        <div className="grid w-full grid-cols-2 gap-3">
          <NeonButton variant="outline" onClick={handleDownload} disabled={!blob || generating}>
            <Download size={14} /> Salvar
          </NeonButton>
          <NeonButton onClick={handleShareWhatsApp} disabled={!blob || !clientPhone || generating}>
            <MessageCircle size={14} /> Compartilhar no WhatsApp
          </NeonButton>
        </div>
      </div>
    </Modal>
  );
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

/** Monta o elemento off-screen (1080x1350) que vira o comprovante via html2canvas. */
function buildReceiptContainer(quote: QuoteWithClient, profile: ReceiptProfile | null, appearance: ReceiptAppearance) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "1080px";
  container.style.height = "1350px";
  container.style.padding = "72px 64px";
  container.style.boxSizing = "border-box";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.fontFamily = "'Montserrat', Arial, sans-serif";
  container.style.color = "#F5F3FA";
  container.style.background =
    "radial-gradient(circle at 50% 0%, rgba(170,23,219,0.28) 0%, rgba(11,9,20,0) 60%), #0B0914";

  const studioName = profile?.studio_name || "Meu Estúdio";
  const clientName = quote.clients?.name ?? quote.buyer_name ?? "Cliente não informado";
  const saleDate = new Date(quote.sent_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const productName = quote.products?.name || quote.project_name;
  const quantity = quote.quantity ?? 1;
  const productValue =
    quote.unit_price != null && quote.quantity != null
      ? quote.unit_price * quote.quantity
      : quote.final_price - (quote.shipping_cost ?? 0) + (quote.discount_amount ?? 0);
  const paymentLabel = quote.payment_method ? QUOTE_PAYMENT_METHOD_LABELS[quote.payment_method] : "—";

  const logoHtml = profile?.avatar_url
    ? `<img src="${profile.avatar_url}" crossorigin="anonymous" style="width:96px; height:96px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.16);" />`
    : `<div style="width:96px; height:96px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:700; background:linear-gradient(135deg, #E86333 0%, #FF4EDF 50%, #AA17DB 100%); color:#fff;">${initials(studioName)}</div>`;

  const shippingLine =
    quote.shipping_cost != null && quote.shipping_cost > 0
      ? `<div style="display:flex; justify-content:space-between; font-size:26px; color:#B4AFC4; margin-top:14px;">
           <span>Valor do Frete</span>
           <span style="color:#F5F3FA;">${formatBRL(quote.shipping_cost)}</span>
         </div>`
      : "";

  const discountLine =
    quote.discount_amount && quote.discount_amount > 0
      ? `<div style="display:flex; justify-content:space-between; font-size:26px; color:#FF8A8A; margin-top:14px;">
           <span>${
             quote.discount_type === "coupon" && quote.coupon_code
               ? `Desconto (cupom ${quote.coupon_code})`
               : "Desconto"
           }</span>
           <span>-${formatBRL(quote.discount_amount)}</span>
         </div>`
      : "";

  // production_deadline_date (novo, campo de data real) tem prioridade —
  // production_deadline (texto livre) só entra pra vendas antigas, salvas
  // antes dessa mudança, que não têm a data estruturada.
  const deadlineText = quote.production_deadline_date
    ? new Date(`${quote.production_deadline_date}T00:00:00`).toLocaleDateString("pt-BR")
    : quote.production_deadline;
  const deadlineLine =
    deadlineText && appearance.showProductionDeadline
      ? `<div style="display:flex; justify-content:space-between; font-size:24px; color:#B4AFC4; margin-top:10px;">
         <span>Prazo de Produção</span>
         <span style="color:#F5F3FA; font-weight:600;">${deadlineText}</span>
       </div>`
      : "";

  const footerParts = [
    profile?.instagram ? `@${profile.instagram.replace(/^@/, "")}` : null,
    profile?.website || null,
  ].filter(Boolean);

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center;">
      ${logoHtml}
      <p style="margin:24px 0 4px; font-size:22px; letter-spacing:0.08em; text-transform:uppercase; color:#B4AFC4;">Comprovante de Venda</p>
      <p style="margin:0; font-size:34px; font-weight:700;">${studioName}</p>
    </div>

    <div style="margin-top:40px; display:flex; justify-content:space-between; font-size:26px; color:#B4AFC4;">
      <span>${clientName}</span>
      <span>${saleDate}</span>
    </div>

    <div style="margin:28px 0; height:1px; background:rgba(255,255,255,0.12);"></div>

    <div style="font-size:30px; font-weight:600;">${productName}</div>
    <div style="display:flex; justify-content:space-between; font-size:26px; color:#B4AFC4; margin-top:10px;">
      <span>Quantidade</span>
      <span style="color:#F5F3FA;">${quantity}</span>
    </div>
    <div style="display:flex; justify-content:space-between; font-size:26px; color:#B4AFC4; margin-top:10px;">
      <span>Valor do Produto</span>
      <span style="color:#F5F3FA;">${formatBRL(productValue)}</span>
    </div>
    ${shippingLine}
    ${discountLine}

    <div style="margin:28px 0; height:1px; background:rgba(255,255,255,0.12);"></div>

    <div style="display:flex; justify-content:space-between; align-items:baseline;">
      <span style="font-size:28px; color:#B4AFC4;">Valor Total</span>
      <span style="font-size:56px; font-weight:800; color:${appearance.accentColor};">${formatBRL(quote.final_price)}</span>
    </div>

    <div style="margin-top:24px; display:flex; justify-content:space-between; font-size:24px; color:#B4AFC4;">
      <span>Forma de Pagamento</span>
      <span style="color:#F5F3FA; font-weight:600;">${paymentLabel}</span>
    </div>
    ${deadlineLine}

    <div style="flex:1;"></div>

    ${
      footerParts.length > 0
        ? `<div style="text-align:center; font-size:22px; color:#726C85; border-top:1px solid rgba(255,255,255,0.08); padding-top:24px;">${footerParts.join(" · ")}</div>`
        : ""
    }
    ${
      appearance.footerMessage
        ? `<div style="text-align:center; font-size:20px; color:#726C85; margin-top:10px;">${appearance.footerMessage}</div>`
        : ""
    }
  `;

  return container;
}
