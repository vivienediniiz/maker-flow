"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: Category | null;
  onSaved: (category: Category) => void;
}

export function CategoryModal({ open, onClose, category, onSaved }: CategoryModalProps) {
  const supabase = createClient();
  const isEditing = !!category;

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setError(null);
  }, [open, category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (isEditing && category) {
      const { data, error: updateError } = await supabase
        .from("categories")
        .update({ name })
        .eq("id", category.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as Category);
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
      .from("categories")
      .insert({ name, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as Category);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Categoria" : "Nova Categoria"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Decoração"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar Categoria"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
