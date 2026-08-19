"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { CouponModal } from "@/components/dashboard/CouponModal";
import { createClient } from "@/lib/supabase/client";
import { getCouponStatusLabel } from "@/lib/coupons";
import { formatBRL, cn } from "@/lib/utils";
import type { Coupon } from "@/lib/types";

const STATUS_STYLES: Record<ReturnType<typeof getCouponStatusLabel>, string> = {
  Ativo: "bg-neon-green/15 text-neon-green border-neon-green/30",
  Inativo: "bg-white/10 text-text-secondary border-white/10",
  Expirado: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Esgotado: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function CouponsRegistrationTab() {
  const supabase = createClient();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCoupons((data as Coupon[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cupom? Vendas que já usaram esse cupom mantêm o registro, mas ele some da lista. Essa ação não pode ser desfeita.")) return;
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("coupons").delete().eq("id", id);
  }

  function openCreate() {
    setEditingCoupon(null);
    setModalOpen(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setModalOpen(true);
  }

  function handleSaved(coupon: Coupon) {
    setCoupons((prev) => {
      const exists = prev.some((c) => c.id === coupon.id);
      return exists ? prev.map((c) => (c.id === coupon.id ? coupon : c)) : [coupon, ...prev];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg">Cupons</h3>
        <NeonButton size="sm" onClick={openCreate} className="whitespace-nowrap">
          <Plus size={14} /> Novo Cupom
        </NeonButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhum cupom cadastrado ainda. Clique em &quot;Novo Cupom&quot; pra começar.
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-glass">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Código</th>
                  <th className="px-6 py-4 font-medium">Campanha</th>
                  <th className="px-6 py-4 font-medium">Desconto</th>
                  <th className="px-6 py-4 font-medium">Uso</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="w-20 px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const status = getCouponStatusLabel(c);
                  return (
                    <tr key={c.id} className="border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-medium text-text-primary">{c.code}</td>
                      <td className="px-6 py-4 text-text-secondary">{c.campaign_name || "—"}</td>
                      <td className="px-6 py-4 font-numeric text-text-secondary">
                        {c.discount_type === "percentage" ? `${c.discount_value}%` : formatBRL(c.discount_value)}
                      </td>
                      <td className="px-6 py-4 font-numeric text-text-secondary">
                        {c.usage_limit != null ? `${c.times_used}/${c.usage_limit}` : `${c.times_used}`}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center rounded-pill border px-2.5 py-1 text-[11px] font-medium", STATUS_STYLES[status])}>
                          {status}
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center">
                          <button onClick={() => openEdit(c)} className="p-2.5 text-text-muted hover:text-text-primary" aria-label="Editar cupom">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-2.5 text-text-muted hover:text-red-400" aria-label="Excluir cupom">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <CouponModal open={modalOpen} onClose={() => setModalOpen(false)} coupon={editingCoupon} onSaved={handleSaved} />
    </div>
  );
}
