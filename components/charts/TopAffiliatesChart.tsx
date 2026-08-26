"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export interface TopAffiliatePoint {
  label: string;
  amount: number;
}

export function TopAffiliatesChart({ data }: { data: TopAffiliatePoint[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-text-muted">Nenhuma comissão gerada ainda.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
          <YAxis type="category" dataKey="label" stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} width={110} />
          <Tooltip
            contentStyle={{
              background: "#17132A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#F5F3FA" }}
            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita gerada"]}
          />
          <Bar dataKey="amount" fill="#AA17DB" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
