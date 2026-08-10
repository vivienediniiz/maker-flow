"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const data = [
  { month: "Fev", receita: 4200, custo: 1800, lucro: 2400 },
  { month: "Mar", receita: 5100, custo: 2100, lucro: 3000 },
  { month: "Abr", receita: 4700, custo: 2300, lucro: 2400 },
  { month: "Mai", receita: 6200, custo: 2500, lucro: 3700 },
  { month: "Jun", receita: 7100, custo: 2700, lucro: 4400 },
  { month: "Jul", receita: 8300, custo: 3100, lucro: 5200 },
];

export function FinancialChart() {
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
          />
          <Area type="monotone" dataKey="receita" stroke="#FF4EDF" fill="url(#receita)" strokeWidth={2} />
          <Area type="monotone" dataKey="lucro" stroke="#00FF9D" fill="url(#lucro)" strokeWidth={2} />
          <Area type="monotone" dataKey="custo" stroke="#E86333" fill="url(#custo)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
