"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import type { Quote, Coupon, QuoteSource } from "@/lib/types";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
}

interface CampaignRow {
  key: string;
  label: string;
  count: number;
  totalDiscount: number;
  totalRevenue: number;
  netProfit: number;
}

interface CouponsCampaignsSectionProps {
  /** Mesmo filtro de Origem já usado pelos outros KPIs do Financeiro. */
  source: "all" | QuoteSource;
}

export function CouponsCampaignsSection({ source }: CouponsCampaignsSectionProps) {
  const supabase = createClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
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

      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);

      const [{ data: quoteData }, { data: couponData }] = await Promise.all([
        supabase
          .from("quotes")
          .select("*")
          .eq("user_id", user.id)
          .not("coupon_id", "is", null)
          .in("status", ["paid", "in_production", "shipped"])
          .gte("sent_at", start.toISOString())
          .lt("sent_at", end.toISOString()),
        supabase.from("coupons").select("*").eq("user_id", user.id),
      ]);

      setQuotes((quoteData as Quote[]) ?? []);
      setCoupons((couponData as Coupon[]) ?? []);
      setLoading(false);
    })();
  }, [month, year]);

  const couponsById = useMemo(() => new Map(coupons.map((c) => [c.id, c])), [coupons]);

  const filteredQuotes = useMemo(
    () => quotes.filter((q) => source === "all" || q.source === source),
    [quotes, source]
  );

  // Agrupa por campanha quando o cupom tem campaign_name; senão, cada código vira sua própria linha.
  const rows = useMemo(() => {
    const map = new Map<string, CampaignRow>();
    for (const q of filteredQuotes) {
      if (!q.coupon_id) continue;
      const coupon = couponsById.get(q.coupon_id);
      const label = coupon?.campaign_name || coupon?.code || q.coupon_code || "—";
      const key = coupon?.campaign_name ? `campaign:${coupon.campaign_name}` : `code:${label}`;
      const entry = map.get(key) ?? { key, label, count: 0, totalDiscount: 0, totalRevenue: 0, netProfit: 0 };
      entry.count += 1;
      entry.totalDiscount += q.discount_amount ?? 0;
      entry.totalRevenue += q.final_price;
      entry.netProfit += q.net_amount;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.totalDiscount - a.totalDiscount);
  }, [filteredQuotes, couponsById]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Cupons e Campanhas</h3>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="glass-input">
            {MONTH_NAMES.map((label, idx) => (
              <option key={label} value={idx} className="bg-bg-raised">
                {label}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="glass-input">
            {buildYearOptions().map((y) => (
              <option key={y} value={y} className="bg-bg-raised">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <GlassCard padding="lg" className="text-center text-sm text-text-muted">
          Nenhum cupom usado nesse mês.
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-glass">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Campanha/Código</th>
                  <th className="px-6 py-4 font-medium">Usos</th>
                  <th className="px-6 py-4 font-medium">Total Descontado</th>
                  <th className="px-6 py-4 font-medium">Receita Bruta</th>
                  <th className="px-6 py-4 font-medium">Lucro Líquido</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-text-primary">{r.label}</td>
                    <td className="px-6 py-4 text-text-secondary">{r.count}</td>
                    <td className="font-numeric px-6 py-4 text-red-400">{formatBRL(r.totalDiscount)}</td>
                    <td className="font-numeric px-6 py-4 text-text-primary">{formatBRL(r.totalRevenue)}</td>
                    <td className="font-numeric px-6 py-4 text-neon-green">{formatBRL(r.netProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </section>
  );
}
