"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { PrinterModal } from "@/components/dashboard/PrinterModal";
import { STATUS_DOT, STATUS_LABEL } from "@/components/dashboard/PrinterCard";
import { createClient } from "@/lib/supabase/client";
import { cn, formatBRL } from "@/lib/utils";
import type { Printer } from "@/lib/types";

export function PrintersRegistrationTab() {
  const supabase = createClient();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  useEffect(() => {
    loadPrinters();
  }, []);

  async function loadPrinters() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("printers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPrinters((data as Printer[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta impressora? Essa ação não pode ser desfeita.")) return;
    setPrinters((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("printers").delete().eq("id", id);
  }

  function openCreate() {
    setEditingPrinter(null);
    setModalOpen(true);
  }

  function openEdit(printer: Printer) {
    setEditingPrinter(printer);
    setModalOpen(true);
  }

  function handleSaved(printer: Printer) {
    setPrinters((prev) => {
      const exists = prev.some((p) => p.id === printer.id);
      return exists ? prev.map((p) => (p.id === printer.id ? printer : p)) : [printer, ...prev];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">Impressoras</h3>
        <NeonButton size="sm" onClick={openCreate}>
          <Plus size={14} /> Nova Impressora
        </NeonButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : printers.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhuma impressora cadastrada ainda. Clique em &quot;Nova Impressora&quot; pra começar.
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-glass">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Impressora</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Potência</th>
                  <th className="px-6 py-4 font-medium">Custo/hora</th>
                  <th className="px-6 py-4 font-medium">Chave de webhook</th>
                  <th className="w-20 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {printers.map((p) => (
                  <tr key={p.id} className="border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary">{p.name}</p>
                      <p className="text-xs text-text-muted">{p.model || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[p.status])} />
                        {STATUS_LABEL[p.status]}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-numeric text-text-secondary">{p.watts_power}W</td>
                    <td className="px-6 py-4 font-numeric text-text-secondary">{formatBRL(p.cost_per_hour)}</td>
                    <td className="px-6 py-4">
                      <InlineApiKey apiKey={p.api_key_webhook} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-text-muted hover:text-text-primary"
                          aria-label="Editar impressora"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-text-muted hover:text-red-400"
                          aria-label="Excluir impressora"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <PrinterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        printer={editingPrinter}
        onSaved={handleSaved}
      />
    </div>
  );
}

function InlineApiKey({ apiKey }: { apiKey: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!apiKey) return <span className="text-text-muted">—</span>;

  function copy() {
    navigator.clipboard.writeText(apiKey!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg border border-border-glass px-2 py-1 text-[11px] text-text-secondary hover:text-text-primary"
      title={apiKey}
    >
      <code className="max-w-[110px] truncate">{apiKey}</code>
      {copied ? <Check size={11} className="text-neon-green" /> : <Copy size={11} />}
    </button>
  );
}
