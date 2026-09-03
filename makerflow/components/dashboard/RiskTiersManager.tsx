"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { RiskTier } from "@/lib/types";

const DEFAULT_TIERS: { name: string; extra_margin_percent: number; description: string }[] = [
  { name: "Baixo Risco", extra_margin_percent: 0, description: "Peças pequenas e simples, baixo risco de falha" },
  { name: "Médio Risco", extra_margin_percent: 10, description: "Peças médias ou com múltiplas partes" },
  {
    name: "Alto Risco",
    extra_margin_percent: 20,
    description: "Peças grandes, complexas, multicoloridas ou com histórico de falha",
  },
];

function sortTiers(tiers: RiskTier[]) {
  return [...tiers].sort((a, b) => a.extra_margin_percent - b.extra_margin_percent);
}

export function RiskTiersManager() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<RiskTier[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTiers() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("risk_tiers")
      .select("*")
      .eq("user_id", user.id)
      .order("extra_margin_percent");
    let rows = (data as RiskTier[]) ?? [];

    // Primeira visita — pré-popula com as 3 sugestões padrão, editáveis/excluíveis.
    if (rows.length === 0) {
      const { data: inserted } = await supabase
        .from("risk_tiers")
        .insert(DEFAULT_TIERS.map((t) => ({ ...t, user_id: user.id })))
        .select();
      rows = (inserted as RiskTier[]) ?? [];
    }

    setTiers(sortTiers(rows));
    setLoading(false);
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setName("");
    setPercent("");
    setDescription("");
  }

  function startEdit(t: RiskTier) {
    setCreating(false);
    setEditingId(t.id);
    setName(t.name);
    setPercent(String(t.extra_margin_percent));
    setDescription(t.description ?? "");
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const payload = {
      name: name.trim(),
      extra_margin_percent: Number(percent) || 0,
      description: description.trim() || null,
    };

    if (editingId) {
      const { data } = await supabase.from("risk_tiers").update(payload).eq("id", editingId).select().single();
      if (data) setTiers((prev) => sortTiers(prev.map((t) => (t.id === editingId ? (data as RiskTier) : t))));
    } else {
      const { data } = await supabase
        .from("risk_tiers")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (data) setTiers((prev) => sortTiers([...prev, data as RiskTier]));
    }

    setSaving(false);
    cancelForm();
  }

  async function handleDelete(id: string) {
    setTiers((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("risk_tiers").delete().eq("id", id);
  }

  const showForm = creating || editingId !== null;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-4 text-text-muted">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {tiers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {t.name} <span className="text-neon-pink">+{t.extra_margin_percent}%</span>
                </p>
                {t.description && <p className="text-xs text-text-muted">{t.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="text-text-muted hover:text-text-primary"
                  aria-label="Editar faixa"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  className="text-text-muted hover:text-red-400"
                  aria-label="Excluir faixa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-2 rounded-xl border border-border-glass bg-white/[0.02] p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex: Médio Risco)"
              className="glass-input w-full"
            />
            <input
              type="number"
              min={0}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="% extra"
              className="glass-input w-full"
            />
          </div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="glass-input w-full"
          />
          <div className="flex justify-end gap-2 pt-1">
            <NeonButton type="button" variant="ghost" size="sm" onClick={cancelForm}>
              Cancelar
            </NeonButton>
            <NeonButton type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </NeonButton>
          </div>
        </div>
      ) : (
        <NeonButton type="button" variant="outline" size="sm" onClick={startCreate}>
          <Plus size={14} /> Nova Faixa
        </NeonButton>
      )}
    </div>
  );
}
