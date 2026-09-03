"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export interface FinancialEvolutionPoint {
  label: string;
  receita: number;
  custo: number;
  lucro: number;
}

export function FinancialEvolutionChart({ data }: { data: FinancialEvolutionPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="fe-receita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4EDF" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#FF4EDF" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fe-lucro" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF9D" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#00FF9D" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fe-custo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E86333" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E86333" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#17132A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#F5F3FA" }}
          />
          <Area type="monotone" dataKey="receita" stroke="#FF4EDF" fill="url(#fe-receita)" strokeWidth={2} />
          <Area type="monotone" dataKey="lucro" stroke="#00FF9D" fill="url(#fe-lucro)" strokeWidth={2} />
          <Area type="monotone" dataKey="custo" stroke="#E86333" fill="url(#fe-custo)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
