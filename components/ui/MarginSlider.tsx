"use client";

import { Percent } from "lucide-react";

interface MarginSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function MarginSlider({ value, onChange, min = 0, max = 99, label = "Margem de Lucro Alvo" }: MarginSliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="glass-card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
          <Percent size={12} className="text-neon-green" />
          {label}
        </div>
        <span className="rounded-xl border border-neon-green/30 bg-neon-green/10 px-3 py-1 font-numeric text-sm font-semibold text-neon-green">
          {value}%
        </span>
      </div>

      <div className="relative pt-7">
        <div
          className="pointer-events-none absolute -top-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-neon-green/30 bg-bg-raised px-2 py-1 text-[11px] font-medium text-neon-green shadow-neon-glow-green"
          style={{ left: `${percent}%` }}
        >
          Alvo: {value}%
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-slider-green w-full"
          style={{ background: `linear-gradient(to right, #00FF9D ${percent}%, rgba(255,255,255,0.08) ${percent}%)` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-text-muted">
        <span>Mín: {min}%</span>
        <span>Máx: {max}%</span>
      </div>
    </div>
  );
}
