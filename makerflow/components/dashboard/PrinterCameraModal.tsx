"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CameraOff } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { getSnapshotUrl, isSnapshotStale } from "@/lib/printerSnapshot";
import { cn } from "@/lib/utils";
import type { Printer } from "@/lib/types";

const POLL_MS = 4000;

export function PrinterCameraModal({
  open,
  onClose,
  printer,
}: {
  open: boolean;
  onClose: () => void;
  printer: Printer;
}) {
  const supabase = createClient();
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(printer.last_snapshot_at);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLastSnapshotAt(printer.last_snapshot_at);
    setImgError(false);

    let cancelled = false;
    async function poll() {
      const { data } = await supabase
        .from("printers")
        .select("last_snapshot_at")
        .eq("id", printer.id)
        .single();
      if (!cancelled && data?.last_snapshot_at) setLastSnapshotAt(data.last_snapshot_at);
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, printer.id, printer.last_snapshot_at, supabase]);

  const hasSnapshot = !!lastSnapshotAt;
  const stale = isSnapshotStale(lastSnapshotAt);

  return (
    <Modal open={open} onClose={onClose} title={`Câmera — ${printer.name}`}>
      <div className="space-y-3">
        {!hasSnapshot || imgError ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border border-border-glass bg-white/[0.03] text-center">
            <CameraOff size={28} className="text-text-muted" />
            <p className="max-w-[280px] text-sm text-text-muted">
              {hasSnapshot
                ? "Não consegui carregar a imagem."
                : "Câmera não configurada ou impressora sem câmera."}
            </p>
          </div>
        ) : (
          <Image
            key={lastSnapshotAt}
            src={getSnapshotUrl(printer.id, lastSnapshotAt)}
            alt={`Câmera de ${printer.name}`}
            onError={() => setImgError(true)}
            fill
            className="w-full rounded-xl border border-border-glass object-cover"
            sizes="100vw"
          />
        )}

        {hasSnapshot && !imgError && (
          <p className={cn("flex items-center gap-1.5 text-xs", stale ? "text-amber-400" : "text-neon-green")}>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                stale ? "bg-amber-400" : "bg-neon-green animate-pulse-glow"
              )}
            />
            {stale ? "Sem sinal recente — imagem pode estar desatualizada" : "Ao vivo"}
          </p>
        )}
      </div>
    </Modal>
  );
}
