import type { MarketplaceFeeValue } from "./types";

export interface MarketplaceFee {
  name: string;
  /** Percentual cobrado sobre o preço de venda. */
  fee: number;
  /** Valor fixo em R$ cobrado por venda, além do percentual. */
  fixed: number;
}

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Lê `settings.marketplace_fees_json`, que aceita o formato antigo (só o percentual) e o novo (`{ percent, fixed }`). */
export function parseMarketplaceFees(json: Record<string, MarketplaceFeeValue> | null | undefined): MarketplaceFee[] {
  return Object.entries(json ?? {}).map(([name, value]) =>
    typeof value === "object" && value !== null
      ? { name, fee: num(value.percent), fixed: num(value.fixed) }
      : { name, fee: num(value), fixed: 0 }
  );
}

/** Grava no formato antigo quando não há taxa fixa — só vira objeto quando precisa. */
export function serializeMarketplaceFees(rows: MarketplaceFee[]): Record<string, MarketplaceFeeValue> {
  const out: Record<string, MarketplaceFeeValue> = {};
  for (const r of rows) {
    out[r.name] = r.fixed > 0 ? { percent: r.fee, fixed: r.fixed } : r.fee;
  }
  return out;
}

/** "20% + R$ 4,50", "14%" ou "R$ 4,50" — só o que existir. */
export function describeMarketplaceFee(fee: number, fixed: number): string {
  const parts: string[] = [];
  if (fee > 0) parts.push(`${fee}%`);
  if (fixed > 0) parts.push(`R$ ${fixed.toFixed(2).replace(".", ",")}`);
  return parts.join(" + ") || "sem taxa";
}
