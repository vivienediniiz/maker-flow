"use client";

import { useEffect, useState } from "react";
import { Loader2, Paperclip, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { PRINTER_ASSET_STATUS_LABELS } from "@/lib/printerAssets";
import type { PrinterAsset, PrinterAssetStatus, Branch } from "@/lib/types";

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
  const [model, setModel] = useState("");
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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModel(asset?.model ?? "");
    setSerialNumber(asset?.serial_number ?? "");
    setBranchId(asset?.branch_id ?? "");
    setPurchaseDate(asset?.purchase_date ?? "");
    setPurchasePrice(asset?.purchase_price != null ? String(asset.purchase_price) : "");
    setSupplier(asset?.supplier ?? "");
    setInvoiceUrl(asset?.invoice_url ?? null);
    setWarrantyExpiryDate(asset?.warranty_expiry_date ?? "");
    setStatus(asset?.status ?? "active");
    setEstimatedUsageHours(asset ? String(asset.estimated_usage_hours) : "0");
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

    const { data } = supabase.storage.from("printer-invoices").getPublicUrl(path);
    setInvoiceUrl(data.publicUrl);
    setUploadingInvoice(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

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
          <input
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Bambu Lab X1C"
          />
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
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="glass-input w-full"
              placeholder="0.00"
            />
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
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border-glass px-2.5 py-2 text-[11px] text-text-secondary hover:text-text-primary"
              >
                <ExternalLink size={12} /> Ver
              </a>
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
