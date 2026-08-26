"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Toggle } from "@/components/ui/Toggle";
import { createClient } from "@/lib/supabase/client";
import type { StoreBanner } from "@/lib/types";

interface StoreBannersCardProps {
  userId: string;
}

export function StoreBannersCard({ userId }: StoreBannersCardProps) {
  const supabase = createClient();
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadBanners() {
    setLoading(true);
    const { data } = await supabase
      .from("store_banners")
      .select("*")
      .eq("user_id", userId)
      .order("display_order", { ascending: true });
    setBanners((data as StoreBanner[]) ?? []);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}/banner-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("products").upload(path, file);
    if (uploadError) {
      setUploading(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from("products").getPublicUrl(path);

    const maxOrder = banners.reduce((max, b) => Math.max(max, b.display_order), -1);
    const { data, error } = await supabase
      .from("store_banners")
      .insert({
        user_id: userId,
        image_url: publicUrlData.publicUrl,
        display_order: maxOrder + 1,
        active: true,
      })
      .select()
      .single();

    setUploading(false);
    if (!error && data) {
      setBanners((prev) => [...prev, data as StoreBanner]);
    }
    e.target.value = "";
  }

  async function updateBanner(id: string, patch: Partial<StoreBanner>) {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    await supabase.from("store_banners").update(patch).eq("id", id);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este banner?")) return;
    setBanners((prev) => prev.filter((b) => b.id !== id));
    await supabase.from("store_banners").delete().eq("id", id);
  }

  async function handleMove(banner: StoreBanner, direction: "up" | "down") {
    const sorted = [...banners].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((b) => b.id === banner.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    const aOrder = banner.display_order;
    const bOrder = other.display_order;

    setBanners((prev) =>
      prev.map((b) => {
        if (b.id === banner.id) return { ...b, display_order: bOrder };
        if (b.id === other.id) return { ...b, display_order: aOrder };
        return b;
      })
    );

    await Promise.all([
      supabase.from("store_banners").update({ display_order: bOrder }).eq("id", banner.id),
      supabase.from("store_banners").update({ display_order: aOrder }).eq("id", other.id),
    ]);
  }

  const sorted = [...banners].sort((a, b) => a.display_order - b.display_order);

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Banners da Loja</h3>
          <p className="text-sm text-text-secondary">Slideshow automático no topo — recomendado 1600×500px.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-pill border border-border-glassStrong px-4 py-2 text-xs font-medium text-text-primary hover:bg-white/5">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
          Adicionar Banner
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-8 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          Nenhum banner cadastrado — a loja funciona normalmente sem essa seção.
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((banner, idx) => (
            <div key={banner.id} className="flex flex-col gap-3 rounded-xl border border-border-glass bg-white/[0.02] p-3 sm:flex-row sm:items-center">
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-white/[0.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={banner.title ?? ""}
                  onChange={(e) => updateBanner(banner.id, { title: e.target.value || null })}
                  placeholder="Título (opcional)"
                  className="glass-input w-full"
                />
                <input
                  value={banner.subtitle ?? ""}
                  onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value || null })}
                  placeholder="Subtítulo (opcional)"
                  className="glass-input w-full"
                />
                <input
                  value={banner.target_link ?? ""}
                  onChange={(e) => updateBanner(banner.id, { target_link: e.target.value || null })}
                  placeholder="Link de destino (opcional)"
                  className="glass-input w-full sm:col-span-2"
                />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Toggle checked={banner.active} onChange={(v) => updateBanner(banner.id, { active: v })} />
                <div className="flex flex-col">
                  <button
                    onClick={() => handleMove(banner, "up")}
                    disabled={idx === 0}
                    className="text-text-muted hover:text-text-primary disabled:opacity-30"
                    aria-label="Mover banner pra cima"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(banner, "down")}
                    disabled={idx === sorted.length - 1}
                    className="text-text-muted hover:text-text-primary disabled:opacity-30"
                    aria-label="Mover banner pra baixo"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <button onClick={() => handleDelete(banner.id)} className="p-1.5 text-text-muted hover:text-red-400" aria-label="Excluir banner">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
