"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { CategoryModal } from "@/components/dashboard/CategoryModal";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import type { Category } from "@/lib/types";

export function CategoriesRegistrationTab() {
  const supabase = createClient();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!(await confirm("Excluir esta categoria? Essa ação não pode ser desfeita."))) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("categories").delete().eq("id", id);
  }

  function openCreate() {
    setEditingCategory(null);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setModalOpen(true);
  }

  function handleSaved(category: Category) {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      return exists ? prev.map((c) => (c.id === category.id ? category : c)) : [category, ...prev];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg">Categorias</h3>
        <NeonButton size="sm" onClick={openCreate} className="whitespace-nowrap">
          <Plus size={14} /> Nova Categoria
        </NeonButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhuma categoria cadastrada ainda. Clique em &quot;Nova Categoria&quot; pra começar.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <GlassCard key={c.id} hover padding="md" className="flex items-center justify-between">
              <p className="min-w-0 truncate text-sm font-medium text-text-primary">{c.name}</p>
              <div className="-mr-1.5 flex shrink-0 items-center">
                <button onClick={() => openEdit(c)} className="p-1.5 text-text-muted hover:text-text-primary" aria-label="Editar categoria">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-text-muted hover:text-red-400" aria-label="Excluir categoria">
                  <Trash2 size={14} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editingCategory}
        onSaved={handleSaved}
      />
    </div>
  );
}
