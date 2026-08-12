"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Printer } from "@/lib/types";

interface PrinterModalProps {
  open: boolean;
  onClose: () => void;
  printer?: Printer | null;
  onSaved: (printer: Printer) => void;
}

export function PrinterModal({ open, onClose, printer, onSaved }: PrinterModalProps) {
  const supabase = createClient();
  const isEditing = !!printer;

  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [wattsPower, setWattsPower] = useState("");
  const [costPerHour, setCostPerHour] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdPrinter, setCreatedPrinter] = useState<Printer | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(printer?.name ?? "");
    setModel(printer?.model ?? "");
    setWattsPower(printer ? String(printer.watts_power) : "");
    setCostPerHour(printer ? String(printer.cost_per_hour) : "");
    setError(null);
    setCreatedPrinter(null);
  }, [open, printer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name,
      model,
      watts_power: Number(wattsPower) || 0,
      cost_per_hour: Number(costPerHour) || 0,
    };

    if (isEditing && printer) {
      const { data, error: updateError } = await supabase
        .from("printers")
        .update(payload)
        .eq("id", printer.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as Printer);
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
      .from("printers")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    const created = data as Printer;
    onSaved(created);
    setCreatedPrinter(created);
  }

  if (createdPrinter) {
    return (
      <Modal open={open} onClose={onClose} title="Impressora criada">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">{createdPrinter.name}</strong> foi cadastrada. Use a chave abaixo
            como Bearer token no script que envia telemetria pra{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">/api/v1/printers/telemetry</code>.
          </p>
          <ApiKeyField apiKey={createdPrinter.api_key_webhook} />
          <p className="text-xs text-amber-400">
            Guarde essa chave agora — ela também fica disponível depois na lista de impressoras.
          </p>
          <div className="flex justify-end pt-2">
            <NeonButton type="button" onClick={onClose}>
              Concluir
            </NeonButton>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Impressora" : "Nova Impressora"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Farm 01"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Modelo</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Bambu Lab X1C"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Potência (W)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={wattsPower}
              onChange={(e) => setWattsPower(e.target.value)}
              className="glass-input w-full"
              placeholder="350"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Custo por hora (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costPerHour}
              onChange={(e) => setCostPerHour(e.target.value)}
              className="glass-input w-full"
              placeholder="0.42"
            />
          </div>
        </div>

        {isEditing && printer?.api_key_webhook && (
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Chave de webhook</label>
            <ApiKeyField apiKey={printer.api_key_webhook} />
          </div>
        )}

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

function ApiKeyField({ apiKey }: { apiKey: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!apiKey) return null;

  function copy() {
    navigator.clipboard.writeText(apiKey!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.03] px-3 py-2.5">
      <KeyRound size={14} className="shrink-0 text-neon-pink" />
      <code className="flex-1 truncate text-xs text-text-secondary">{apiKey}</code>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-glass px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary"
      >
        {copied ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
