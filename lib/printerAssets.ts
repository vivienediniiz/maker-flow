import type { PrinterAssetStatus } from "./types";

// Modelos mais comuns no mercado — sugestoes pro select de modelo,
// que sempre tem "Outro" pra digitacao manual de qualquer modelo fora da lista.
export const PRINTER_MODEL_OPTIONS = [
  "Bambu Lab A1 Mini",
  "Bambu Lab A1",
  "Bambu Lab P1P",
  "Bambu Lab P1S",
  "Bambu Lab X1",
  "Bambu Lab X1 Carbon",
  "Creality Ender 3 V3",
  "Creality Ender 3 S1",
  "Creality K1",
  "Creality K1 Max",
  "Creality CR-10",
  "Elegoo Neptune 4",
  "Elegoo Neptune 4 Pro",
  "Anycubic Kobra 2",
  "Anycubic Kobra 3",
  "Prusa MK4",
  "Prusa Mini+",
  "Voolt3D V-Core",
  "GTMax3D Core A2",
  "Outro",
] as const;

export const PRINTER_ASSET_STATUS_LABELS: Record<PrinterAssetStatus, string> = {
  active: "Ativa",
  maintenance: "Em Manutenção",
  inactive: "Inativa",
  sold: "Vendida",
};

export const PRINTER_ASSET_STATUS_STYLES: Record<PrinterAssetStatus, string> = {
  active: "bg-neon-green/15 text-neon-green border-neon-green/30",
  maintenance: "bg-neon-orange/15 text-neon-orange border-neon-orange/30",
  inactive: "bg-white/10 text-text-secondary border-white/10",
  sold: "bg-white/5 text-text-muted border-white/10",
};

export type WarrantyState = "ok" | "expiring" | "expired" | "none";

/** "expiring" = vence em até 30 dias. */
export function warrantyState(expiryDate: string | null): WarrantyState {
  if (!expiryDate) return "none";
  const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring";
  return "ok";
}

export const WARRANTY_BADGE: Partial<Record<WarrantyState, { label: string; className: string }>> = {
  expiring: { label: "Garantia vence em breve", className: "bg-yellow-400/15 text-yellow-400 border-yellow-400/30" },
  expired: { label: "Garantia vencida", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};
