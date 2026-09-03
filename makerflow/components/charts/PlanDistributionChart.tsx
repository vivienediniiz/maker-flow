"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export interface PlanDistributionSlice {
  name: string;
  value: number;
  color: string;
}

export function PlanDistributionChart({ data }: { data: PlanDistributionSlice[] }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return <p className="py-10 text-center text-sm text-text-muted">Nenhum assinante pago ainda.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#17132A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#F5F3FA" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
