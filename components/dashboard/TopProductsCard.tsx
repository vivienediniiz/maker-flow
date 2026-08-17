"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Loader2, Trophy } from "lucide-react";
import type { Quote } from "@/lib/types";

const TOP_LIMIT = 3;

interface ProductRanking {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
}

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function TopProductsCard() {
  const supabase = createClient();
  const [ranking, setRanking] = useState<ProductRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("quotes")
        .select("product_id, project_name, final_price, sent_at")
        .eq("user_id", user.id)
        .in("status", ["paid", "in_production", "shipped"])
        .gte("sent_at", monthStart().toISOString());

      const quotes = (data as Pick<Quote, "product_id" | "project_name" | "final_price" | "sent_at">[]) ?? [];

      const byKey = new Map<string, ProductRanking>();
      for (const q of quotes) {
        const key = q.product_id ?? `name:${q.project_name}`;
        const existing = byKey.get(key);
        if (existing) {
          existing.quantity += 1;
          existing.revenue += q.final_price;
        } else {
          byKey.set(key, { key, name: q.project_name, quantity: 1, revenue: q.final_price });
        }
      }

      const sorted = Array.from(byKey.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, TOP_LIMIT);

      setRanking(sorted);
      setLoading(false);
    })();
  }, []);

  return (
    <GlassCard padding="lg" className="space-y-4">
      <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Produtos Mais Vendidos do Mês</h3>

      {loading ? (
        <div className="flex justify-center py-8 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : ranking.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma venda registrada este mês ainda.</p>
      ) : (
        <div className="space-y-2">
          {ranking.map((p, i) => (
            <div key={p.key} className="flex items-center gap-3 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-text-secondary">
                {i === 0 ? <Trophy size={12} className="text-neon-orange" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{p.name}</p>
                <p className="text-xs text-text-muted">{p.quantity} {p.quantity === 1 ? "venda" : "vendas"}</p>
              </div>
              <span className="font-numeric shrink-0 text-sm font-medium text-neon-green">{formatBRL(p.revenue)}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
