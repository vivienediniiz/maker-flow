"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

export interface ChurnPoint {
  label: string;
  cancellations: number;
}

/** Meta de churn diário aceitável, só como referência visual — não é um cálculo, é um valor fixo de contexto. */
const ACCEPTABLE_DAILY_CHURN = 1;

export function ChurnRateChart({ data }: { data: ChurnPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#726C85" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#17132A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: "#F5F3FA" }}
          />
          <ReferenceLine y={ACCEPTABLE_DAILY_CHURN} stroke="#726C85" strokeDasharray="4 4" />
          <Bar dataKey="cancellations" name="Cancelamentos" fill="#FF5A5A" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
