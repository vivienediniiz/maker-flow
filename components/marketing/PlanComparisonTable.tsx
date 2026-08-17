import { Check, X } from "lucide-react";
import { FEATURE_COMPARISON } from "@/lib/plans";

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={16} className="mx-auto text-neon-green" />
    ) : (
      <X size={16} className="mx-auto text-text-muted" />
    );
  }
  return <span className="text-xs text-text-secondary">{value}</span>;
}

export function PlanComparisonTable() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-glass">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
              <th className="px-6 py-4 font-medium">Recurso</th>
              <th className="px-6 py-4 text-center font-medium">Grátis</th>
              <th className="px-6 py-4 text-center font-medium">Mensal / Trimestral</th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_COMPARISON.map((row) => (
              <tr key={row.label} className="border-b border-border-glass/60">
                <td className="px-6 py-4 text-text-primary">{row.label}</td>
                <td className="px-6 py-4 text-center">
                  <Cell value={row.free} />
                </td>
                <td className="px-6 py-4 text-center">
                  <Cell value={row.paid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
