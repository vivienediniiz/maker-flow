"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const SERIES_LABELS: Record<string, string> = {
  receita: "Receita",
  custo: "Custo",
  lucro: "Lucro",
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface MonthPoint {
  month: string;
  receita: number;
  custo: number;
  lucro: number;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function shortMonthLabel(date: Date) {
  const label = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function FinancialChart() {
  const supabase = createClient();
  const [data, setData] = useState<MonthPoint[] | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setData([]);
        return;
      }

      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1));
      const rangeStart = months[0];
      const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const { data: quotes } = await supabase
        .from("quotes")
        .select("final_price, platform_fee, cost_amount, sent_at")
        .eq("user_id", user.id)
        .in("status", ["paid", "in_production", "shipped"])
        .gte("sent_at", rangeStart.toISOString())
        .lt("sent_at", rangeEnd.toISOString());

      const buckets = new Map<string, { receita: number; custo: number }>();
      for (const m of months) buckets.set(monthKey(m), { receita: 0, custo: 0 });

      for (const q of quotes ?? []) {
        const sentAt = new Date(q.sent_at);
        const bucket = buckets.get(monthKey(new Date(sentAt.getFullYear(), sentAt.getMonth(), 1)));
        if (!bucket) continue;
        bucket.receita += q.final_price;
        bucket.custo += q.platform_fee + q.cost_amount;
      }

      setData(
        months.map((m) => {
          const b = buckets.get(monthKey(m))!;
          const receita = round2(b.receita);
          const custo = round2(b.custo);
          return { month: shortMonthLabel(m), receita, custo, lucro: round2(receita - custo) };
        })
      );
    })();
  }, []);

  if (data == null) {
    return (
      <div className="flex h-72 items-center justify-center text-text-muted">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="receita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4EDF" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#FF4EDF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="custo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E86333" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E86333" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#17132A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#F5F3FA" }}
            formatter={(value: number, name: string) => [formatBRL(value), SERIES_LABELS[name] ?? name]}
          />
          <Area type="monotone" dataKey="receita" stroke="#FF4EDF" fill="url(#receita)" strokeWidth={2} />
          <Area type="monotone" dataKey="lucro" stroke="#00FF9D" fill="url(#lucro)" strokeWidth={2} />
          <Area type="monotone" dataKey="custo" stroke="#E86333" fill="url(#custo)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
