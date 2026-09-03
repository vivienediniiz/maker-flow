"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export interface RevenueSubscribersPoint {
  label: string;
  mrr: number;
  subscribers: number;
}

export function RevenueSubscribersChart({ data }: { data: RevenueSubscribersPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="mrr"
            stroke="#4EA8FF"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `R$${v}`}
          />
          <YAxis yAxisId="subscribers" orientation="right" stroke="#00FF9D" fontSize={11} tickLine={false} axisLine={false} />
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
          <Line yAxisId="mrr" type="monotone" dataKey="mrr" name="MRR (R$)" stroke="#4EA8FF" strokeWidth={2} dot={false} />
          <Line
            yAxisId="subscribers"
            type="monotone"
            dataKey="subscribers"
            name="Assinantes"
            stroke="#00FF9D"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
