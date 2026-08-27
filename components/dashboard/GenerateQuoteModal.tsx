"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyQuoteCount, canCreateMoreQuotes, limitFor } from "@/lib/entitlements";
import { formatBRL } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface CalculatorSummary {
  projectName: string;
  quantity: number;
  finalPrice: number;
  pricePerPiece: number;
  weightG: number;
  printTimeMin: number;
  energyCost: number;
  filamentCost: number;
  marginPercent: number;
  productId?: string;
}

interface StudioInfo {
  studioName: string;
  avatarUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  accentColor: string;
  footerMessage: string | null;
}

export function GenerateQuoteModal({
  open,
  onClose,
  summary,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  summary: CalculatorSummary;
  onGenerated?: () => void;
}) {
  const supabase = createClient();
  const { tier } = useSubscription();
  const [mode, setMode] = useState<"select" | "new">("select");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadClients();
    setMode("select");
    setSelectedClientId("");
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewAddress("");
    setError(null);
  }, [open]);

  async function loadClients() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setClients((data as Client[]) ?? []);
  }

  async function getStudioInfo(): Promise<StudioInfo> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        studioName: "Meu Estúdio",
        avatarUrl: null,
        phone: null,
        email: null,
        website: null,
        accentColor: "#FF4EDF",
        footerMessage: null,
      };
    }

    const [{ data }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("studio_name, full_name, avatar_url, phone, email, website").eq("id", user.id).single(),
      supabase.from("settings").select("pdf_accent_color, pdf_footer_message").eq("user_id", user.id).single(),
    ]);

    return {
      studioName: data?.studio_name || data?.full_name || "Meu Estúdio",
      avatarUrl: data?.avatar_url ?? null,
      phone: data?.phone ?? null,
      email: data?.email ?? user.email ?? null,
      website: data?.website ?? null,
      accentColor: settings?.pdf_accent_color || "#FF4EDF",
      footerMessage: settings?.pdf_footer_message ?? null,
    };
  }

  async function generatePdf(clientName: string) {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const studio = await getStudioInfo();

    const today = new Date();
    const orcamentoNumero = `#${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}${String(
      today.getDate()
    ).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`;
    const validadeAte = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);

    const container = document.createElement("div");
    container.style.width = "800px";
    container.style.padding = "40px";
    container.style.position = "relative";
    container.style.fontFamily = "'Segoe UI', Arial, sans-serif";
    container.style.background = "#FFFFFF";
    container.style.color = "#1A1625";

    // Plano Grátis: PDF sai com marca d'água (é o motor de aquisição gratuito
    // do produto — cada orçamento enviado ao cliente do maker vira um anúncio).
    const watermarkHtml =
      tier === "free"
        ? `<div style="position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:50; display:flex; align-items:center; justify-content:center;">
             <div style="transform:rotate(-30deg); font-size:56px; font-weight:800; color:rgba(170,23,219,0.12); white-space:nowrap; letter-spacing:2px;">
               STUDIOMAKER · GRÁTIS · STUDIOMAKER · GRÁTIS
             </div>
           </div>`
        : "";

    container.innerHTML = `
      ${watermarkHtml}
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid ${studio.accentColor}; padding-bottom:16px; margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${
            studio.avatarUrl
              ? `<img src="${studio.avatarUrl}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;" crossorigin="anonymous" />`
              : `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#E86333,#FF4EDF,#AA17DB);"></div>`
          }
          <div>
            <p style="margin:0;font-size:20px;font-weight:700;color:#1A1625;">${studio.studioName}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#AA17DB;font-weight:600;">ORÇAMENTO DE IMPRESSÃO 3D</p>
          </div>
        </div>
        <div style="text-align:right;font-size:11px;color:#726C85;">
          ${studio.phone ? `<p style="margin:0;">${studio.phone}</p>` : ""}
          ${studio.email ? `<p style="margin:2px 0 0;">${studio.email}</p>` : ""}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#FAF7FC;border:1px solid #EEE6F2;border-radius:12px;padding:16px 20px;margin-bottom:24px;font-size:12px;">
        <div><strong>Orçamento Nº:</strong> ${orcamentoNumero}</div>
        <div><strong>Data de Emissão:</strong> ${today.toLocaleDateString("pt-BR")}</div>
        <div><strong>Cliente:</strong> ${clientName}</div>
        <div><strong>Válido até:</strong> ${validadeAte.toLocaleDateString("pt-BR")}</div>
      </div>

      <div style="margin-bottom:8px;">
        <div style="border-left:4px solid ${studio.accentColor};padding-left:10px;font-size:14px;font-weight:700;color:#1A1625;margin-bottom:12px;">
          DESCRIÇÃO DO PROJETO
        </div>
        <p style="font-size:13px;color:#3A3548;margin:0 0 24px;">${summary.projectName || "Projeto personalizado"}</p>
      </div>

      <div style="border-left:4px solid #FF4EDF;padding-left:10px;font-size:14px;font-weight:700;color:#1A1625;margin-bottom:12px;">
        VALORES
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px;">
        <thead>
          <tr style="background:#2A2438;color:#FFFFFF;">
            <th style="text-align:left;padding:10px 12px;font-weight:600;">Item</th>
            <th style="text-align:center;padding:10px 12px;font-weight:600;">Quantidade</th>
            <th style="text-align:right;padding:10px 12px;font-weight:600;">Valor Unitário</th>
            <th style="text-align:right;padding:10px 12px;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid #EEE6F2;">
            <td style="padding:10px 12px;">${summary.projectName || "Peça personalizada"}</td>
            <td style="text-align:center;padding:10px 12px;">${summary.quantity}</td>
            <td style="text-align:right;padding:10px 12px;">${formatBRL(summary.pricePerPiece)}</td>
            <td style="text-align:right;padding:10px 12px;font-weight:700;">${formatBRL(summary.finalPrice)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
        <div style="border:1px solid #EEE6F2;border-radius:10px;padding:14px 16px;font-size:11px;">
          <p style="margin:0 0 6px;font-weight:700;color:#1A1625;">Prazos e Entrega</p>
          <p style="margin:0;color:#726C85;">Prazo de produção a combinar após confirmação do pedido. Envio ou retirada local conforme combinado.</p>
        </div>
        <div style="border:1px solid #EEE6F2;border-radius:10px;padding:14px 16px;font-size:11px;">
          <p style="margin:0 0 6px;font-weight:700;color:#1A1625;">Condições de Pagamento</p>
          <p style="margin:0;color:#726C85;">Pagamento via Pix ou cartão, conforme combinado com o estúdio.</p>
        </div>
      </div>

      <p style="text-align:center;font-size:10px;color:#B4AFC4;margin-top:32px;">
        ${studio.studioName}${studio.website ? " · " + studio.website : ""}${studio.email ? " · " + studio.email : ""}
      </p>
      ${
        studio.footerMessage
          ? `<p style="text-align:center;font-size:11px;color:#726C85;margin-top:8px;">${studio.footerMessage}</p>`
          : ""
      }
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#FFFFFF" });
      const imgData = canvas.toDataURL("image/png");

      // Página A4 de verdade (210x297mm), encaixando a imagem capturada pela
      // largura, com altura proporcional — evita o corte que acontecia usando
      // a unidade "px" direto no formato da página.
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // Conteúdo mais alto que uma página — divide em várias páginas.
        let remainingHeight = imgHeight;
        let position = 0;
        while (remainingHeight > 0) {
          doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          remainingHeight -= pageHeight;
          position -= pageHeight;
          if (remainingHeight > 0) doc.addPage();
        }
      }

      doc.save(`orcamento-${(summary.projectName || "projeto").toLowerCase().replace(/\s+/g, "-")}.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const monthlyCount = await getMonthlyQuoteCount(supabase, user.id);
    if (!canCreateMoreQuotes(tier, monthlyCount)) {
      setError(
        `Você atingiu o limite de ${limitFor(tier, "quotesPerMonth")} orçamentos/vendas este mês do seu plano. Assine um plano maior em /dashboard/subscription pra continuar.`
      );
      setSaving(false);
      return;
    }

    let clientId = selectedClientId;
    let clientName = clients.find((c) => c.id === selectedClientId)?.name ?? "";

    if (mode === "new") {
      if (!newName.trim()) {
        setError("Informe o nome do cliente.");
        setSaving(false);
        return;
      }
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          user_id: user.id,
          name: newName,
          phone: newPhone || null,
          email: newEmail || null,
          address: newAddress || null,
        })
        .select()
        .single();

      if (clientError || !newClient) {
        setError(clientError?.message ?? "Falha ao criar cliente.");
        setSaving(false);
        return;
      }
      clientId = newClient.id;
      clientName = newClient.name;
    }

    if (!clientId) {
      setError("Selecione ou cadastre um cliente.");
      setSaving(false);
      return;
    }

    const { error: quoteError } = await supabase.from("quotes").insert({
      user_id: user.id,
      project_name: summary.projectName || "Projeto sem nome",
      weight_g: summary.weightG,
      print_time_min: summary.printTimeMin,
      energy_cost: summary.energyCost,
      filament_cost: summary.filamentCost,
      margin_percent: summary.marginPercent,
      final_price: summary.finalPrice,
      client_id: clientId,
      product_id: summary.productId || null,
      status: "sent",
    });

    setSaving(false);

    if (quoteError) {
      setError(quoteError.message);
      return;
    }

    await generatePdf(clientName);
    onGenerated?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerar Orçamento">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">{summary.projectName || "Projeto sem nome"}</p>
            <p className="text-xs text-text-muted">Dados vêm da calculadora</p>
          </div>
          <span className="neon-text font-numeric text-lg font-semibold">{formatBRL(summary.finalPrice)}</span>
        </div>

        <div className="glass-card flex gap-1 p-1">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium transition-colors sm:min-h-0 ${
              mode === "select" ? "bg-neon-gradient text-white" : "text-text-secondary"
            }`}
          >
            Cliente existente
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium transition-colors sm:min-h-0 ${
              mode === "new" ? "bg-neon-gradient text-white" : "text-text-secondary"
            }`}
          >
            Novo cliente
          </button>
        </div>

        {mode === "select" ? (
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Selecione o cliente</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="glass-input w-full"
            >
              <option value="" className="bg-bg-raised">
                {clients.length === 0 ? "Nenhum cliente cadastrado" : "Selecione..."}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-bg-raised">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="glass-input w-full"
              placeholder="Nome completo"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="glass-input w-full"
                placeholder="WhatsApp"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="glass-input w-full"
                placeholder="E-mail"
              />
            </div>
            <input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="glass-input w-full"
              placeholder="Endereço (opcional)"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Gerando..." : "Gerar Orçamento (PDF)"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}