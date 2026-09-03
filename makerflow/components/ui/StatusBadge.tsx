import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  paid: "bg-neon-green/15 text-neon-green border-neon-green/30",
  pending: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  refunded: "bg-white/10 text-text-secondary border-white/10",
  queued: "bg-white/10 text-text-secondary border-white/10",
  printing: "bg-neon-pink/15 text-neon-pink border-neon-pink/30",
  post_processing: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
  ready: "bg-neon-green/15 text-neon-green border-neon-green/30",
  shipped: "bg-neon-purple/15 text-neon-purple border-neon-purple/30",
};

const LABELS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  failed: "Falhou",
  refunded: "Reembolsado",
  queued: "Na fila",
  printing: "Imprimindo",
  post_processing: "Pós-processamento",
  ready: "Pronto",
  shipped: "Enviado",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-2.5 py-1 text-[11px] font-medium",
        STYLES[status] ?? "bg-white/10 text-text-secondary border-white/10"
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
