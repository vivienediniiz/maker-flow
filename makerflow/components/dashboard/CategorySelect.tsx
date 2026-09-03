"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

export function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (categoryName: string) => void;
}) {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

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
      .order("name");
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: user.id, name: newName.trim() })
      .select()
      .single();

    if (!error && data) {
      setCategories((prev) => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(data.name);
      setNewName("");
      setCreating(false);
    }
  }

  if (creating) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          className="glass-input w-full"
          placeholder="Nome da nova categoria"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="shrink-0 rounded-xl bg-neon-gradient px-3 text-xs font-semibold text-white"
        >
          Criar
        </button>
        <button
          type="button"
          onClick={() => setCreating(false)}
          className="shrink-0 rounded-xl border border-border-glass px-3 text-xs text-text-secondary"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass-input w-full"
        disabled={loading}
      >
        <option value="" className="bg-bg-raised">
          {loading ? "Carregando..." : "Selecione uma categoria"}
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.name} className="bg-bg-raised">
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex shrink-0 items-center gap-1 rounded-xl border border-border-glass bg-white/[0.03] px-3 text-xs text-text-secondary hover:text-text-primary"
      >
        <Plus size={13} /> Nova
      </button>
    </div>
  );
}