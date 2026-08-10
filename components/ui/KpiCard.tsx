import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number; // percent change, positive or negative
  icon: LucideIcon;
  accent?: "orange" | "pink" | "purple" | "green";
}

const accentMap = {
  orange: "text-neon-orange",
  pink: "text-neon-pink",
  purple: "text-neon-purple",
  green: "text-neon-green",
};

export function KpiCard({ label, value, delta, icon: Icon, accent = "pink" }: KpiCardProps) {
  return (
    <GlassCard hover padding="md" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full bg-white/5",
            accentMap[accent]
          )}
        >
          <Icon size={16} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="font-numeric text-2xl font-semibold tracking-tight">{value}</span>
        {delta !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              delta >= 0 ? "text-neon-green" : "text-red-400"
            )}
          >
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </GlassCard>
  );
}
