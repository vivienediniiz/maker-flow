"use client";

import { useEffect, useState } from "react";
import { Loader2, Paperclip, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import { PRINTER_ASSET_STATUS_LABELS, PRINTER_MODEL_OPTIONS, PRINTER_MODEL_POWER_W } from "@/lib/printerAssets";
import { getSignedInvoiceUrl } from "@/lib/printerInvoices";
import type { PrinterAsset, PrinterAssetStatus, Branch } from "@/lib/types";

const MODEL_OPTION_SET: readonly string[] = PRINTER_MODEL_OPTIONS;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface PrinterAssetModalProps {
  open: boolean;
  onClose: () => void;
  asset?: PrinterAsset | null;
  onSaved: (asset: PrinterAsset) => void;
}

export function PrinterAssetModal({ open, onClose, asset, onSaved }: PrinterAssetModalProps) {
  const supabase = createClient();
  const isEditing = !!asset;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [modelOption, setModelOption] = useState<string>(PRINTER_MODEL_OPTIONS[0]);
  const [customModel, setCustomModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [branchId, setBranchId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState("");
  const [status, setStatus] = useState<PrinterAssetStatus>("active");
  const [estimatedUsageHours, setEstimatedUsageHours] = useState("0");
  const [powerConsumptionW, setPowerConsumptionW] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const currentModel = asset?.model ?? "";
    if (currentModel && MODEL_OPTION_SET.includes(currentModel)) {
      setModelOption(currentModel);
      setCustomModel("");
    } else if (currentModel) {
      setModelOption("Outro");
      setCustomModel(currentModel);
    } else {
      setModelOption(PRINTER_MODEL_OPTIONS[0]);
      setCustomModel("");
    }
    setSerialNumber(asset?.serial_number ?? "");
    setBranchId(asset?.branch_id ?? "");
    setPurchaseDate(asset?.purchase_date ?? "");
    setPurchasePrice(asset?.purchase_price != null ? String(asset.purchase_price) : "");
    setSupplier(asset?.supplier ?? "");
    setInvoiceUrl(asset?.invoice_url ?? null);
    setWarrantyExpiryDate(asset?.warranty_expiry_date ?? "");
    setStatus(asset?.status ?? "active");
    setEstimatedUsageHours(asset ? String(asset.estimated_usage_hours) : "0");
    if (asset?.power_consumption_w != null) {
      setPowerConsumptionW(String(asset.power_consumption_w));
    } else if (!asset) {
      const suggested = PRINTER_MODEL_POWER_W[PRINTER_MODEL_OPTIONS[0] as keyof typeof PRINTER_MODEL_POWER_W];
      setPowerConsumptionW(suggested != null ? String(suggested) : "");
    } else {
      setPowerConsumptionW("");
    }
    setNotes(asset?.notes ?? "");
    setError(null);
    loadBranches();
  }, [open, asset]);

  async function loadBranches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("branches").select("*").eq("user_id", user.id).order("name");
    setBranches((data as Branch[]) ?? []);
  }

  async function handleInvoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingInvoice(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploadingInvoice(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("printer-invoices").upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploadingInvoice(false);
      return;
    }

    // Bucket é privado (dado financeiro, não pode ser público) — guarda só
    // o caminho do arquivo; a URL de visualização é gerada assinada, na
    // hora, sob demanda (ver handleViewInvoice).
    setInvoiceUrl(path);
    setUploadingInvoice(false);
  }

  async function handleViewInvoice() {
    if (!invoiceUrl) return;
    const signedUrl = await getSignedInvoiceUrl(supabase, invoiceUrl);
    if (signedUrl) window.open(signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const model = modelOption === "Outro" ? customModel.trim() : modelOption;
    if (!model) {
      setError("Informe o modelo.");
      return;
    }

    setSaving(true);

    const payload = {
      model,
      serial_number: serialNumber || null,
      branch_id: branchId || null,
      purchase_date: purchaseDate || null,
      purchase_price: purchasePrice ? Number(purchasePrice) : null,
      supplier: supplier || null,
      invoice_url: invoiceUrl,
      warranty_expiry_date: warrantyExpiryDate || null,
      status,
      estimated_usage_hours: Number(estimatedUsageHours) || 0,
      power_consumption_w: powerConsumptionW ? Number(powerConsumptionW) : null,
      notes: notes || null,
    };

    if (isEditing && asset) {
      const { data, error: updateError } = await supabase
        .from("printer_assets")
        .update(payload)
        .eq("id", asset.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as PrinterAsset);
      onClose();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("printer_assets")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as PrinterAsset);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Impressora" : "Nova Impressora"}>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto scrollbar-glass pr-1">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Modelo</label>
          <select
            value={modelOption}
            onChange={(e) => {
              const next = e.target.value;
              setModelOption(next);
              // Só sugere o consumo se o campo ainda estiver vazio -- nunca
              // sobrescreve um valor que o usuário já digitou (à mão ou de
              // uma edição anterior).
              if (!powerConsumptionW) {
                const suggested = PRINTER_MODEL_POWER_W[next as keyof typeof PRINTER_MODEL_POWER_W];
                if (suggested != null) setPowerConsumptionW(String(suggested));
              }
            }}
            className="glass-input w-full"
          >
            {PRINTER_MODEL_OPTIONS.map((m) => (
              <option key={m} value={m} className="bg-bg-raised">
                {m}
              </option>
            ))}
          </select>
          {modelOption === "Outro" && (
            <input
              required
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="glass-input mt-2 w-full"
              placeholder="Digite o modelo"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Número de série</label>
            <input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Filial</label>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="glass-input w-full">
              <option value="" className="bg-bg-raised">
                Sem filial
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-bg-raised">
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Data da compra</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Valor pago (R$)</label>
            <CurrencyInput value={purchasePrice} onChange={setPurchasePrice} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Fornecedor</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="glass-input w-full" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nota fiscal (opcional)</label>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-border-glass bg-white/[0.03] px-3 py-2.5 text-xs text-text-secondary hover:text-text-primary">
              {uploadingInvoice ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
              {uploadingInvoice ? "Enviando..." : invoiceUrl ? "Trocar arquivo" : "Selecionar arquivo"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleInvoiceUpload}
              />
            </label>
            {invoiceUrl && (
              <button
                type="button"
                onClick={handleViewInvoice}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border-glass px-2.5 py-2 text-[11px] text-text-secondary hover:text-text-primary"
              >
                <ExternalLink size={12} /> Ver
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Vencimento da garantia</label>
            <input
              type="date"
              value={warrantyExpiryDate}
              onChange={(e) => setWarrantyExpiryDate(e.target.value)}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PrinterAssetStatus)}
              className="glass-input w-full"
            >
              {Object.entries(PRINTER_ASSET_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-bg-raised">
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Horas de uso estimadas</label>
            <input
              type="number"
              step="1"
              min="0"
              value={estimatedUsageHours}
              onChange={(e) => setEstimatedUsageHours(e.target.value)}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">
              Consumo de energia (W) <span className="text-text-muted/60">— opcional</span>
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={powerConsumptionW}
              onChange={(e) => setPowerConsumptionW(e.target.value)}
              className="glass-input w-full"
              placeholder="Ex: 120"
            />
            {PRINTER_MODEL_POWER_W[modelOption as keyof typeof PRINTER_MODEL_POWER_W] != null && (
              <p className="mt-1 text-[11px] text-text-muted">
                Sugestão pra esse modelo — ajuste se souber o consumo real da sua máquina.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="glass-input w-full resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar Impressora"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
