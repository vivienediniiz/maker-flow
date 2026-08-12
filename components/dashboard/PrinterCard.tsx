import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { Thermometer, Clock, FileBox } from "lucide-react";
import type { Printer } from "@/lib/types";

export const STATUS_LABEL: Record<Printer["status"], string> = {
  idle: "Ociosa",
  printing: "Imprimindo",
  paused: "Pausada",
  error: "Erro",
  offline: "Offline",
};

export const STATUS_DOT: Record<Printer["status"], string> = {
  idle: "bg-text-muted",
  printing: "bg-neon-green shadow-neon-glow-green animate-pulse-glow",
  paused: "bg-neon-orange shadow-neon-glow-orange",
  error: "bg-red-500",
  offline: "bg-text-muted",
};

export function PrinterCard({ printer }: { printer: Printer }) {
  const isActive = printer.status === "printing" || printer.status === "paused";
  const progress = printer.current_progress_percent;
  const hasTemps = printer.current_nozzle_temp_c !== null || printer.current_bed_temp_c !== null;

  return (
    <GlassCard hover padding="md" className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-text-primary">{printer.name}</p>
          <p className="text-xs text-text-muted">{printer.model}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-pill bg-white/5 px-2.5 py-1 text-[10px] text-text-secondary">
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[printer.status])} />
          {STATUS_LABEL[printer.status]}
        </div>
      </div>

      {isActive ? (
        <>
          {printer.current_file_name && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <FileBox size={13} className="text-neon-pink" />
              <span className="truncate">{printer.current_file_name}</span>
            </div>
          )}

          {progress !== null && (
            <div>
              <div className="mb-1.5 flex justify-between text-[11px] text-text-muted">
                <span>{progress}%</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> ETA {printer.current_eta_minutes ?? "—"} min
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-pill bg-white/5">
                <div
                  className="h-full rounded-pill bg-neon-gradient shadow-neon-glow transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {hasTemps && (
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <Thermometer size={11} className="text-neon-orange" /> Bico {printer.current_nozzle_temp_c ?? "—"}°C
              </span>
              <span className="flex items-center gap-1">
                <Thermometer size={11} className="text-neon-purple" /> Mesa {printer.current_bed_temp_c ?? "—"}°C
              </span>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-text-muted">Sem trabalho em andamento.</p>
      )}
    </GlassCard>
  );
}
