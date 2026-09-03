"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Branch, BranchType } from "@/lib/types";

interface BranchModalProps {
  open: boolean;
  onClose: () => void;
  branch?: Branch | null;
  onSaved: (branch: Branch) => void;
}

export function BranchModal({ open, onClose, branch, onSaved }: BranchModalProps) {
  const supabase = createClient();
  const isEditing = !!branch;

  const [name, setName] = useState("");
  const [type, setType] = useState<BranchType>("matriz");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(branch?.name ?? "");
    setType(branch?.type ?? "matriz");
    setAddress(branch?.address ?? "");
    setError(null);
  }, [open, branch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { name, type, address: address || null };

    if (isEditing && branch) {
      const { data, error: updateError } = await supabase
        .from("branches")
        .update(payload)
        .eq("id", branch.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as Branch);
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
      .from("branches")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as Branch);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Filial" : "Nova Filial"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Estúdio Principal"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as BranchType)} className="glass-input w-full">
            <option value="matriz" className="bg-bg-raised">Matriz</option>
            <option value="filial" className="bg-bg-raised">Filial</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Endereço</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="glass-input w-full"
            placeholder="Rua, número, cidade — UF"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar Filial"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
