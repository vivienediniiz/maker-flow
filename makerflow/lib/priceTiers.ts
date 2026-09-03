import { formatBRL } from "@/lib/utils";
import type { PriceTier } from "@/lib/types";

export interface PriceTierRange {
  /** Índice no array `tiers` original recebido (não no array ordenado). */
  originalIndex: number;
  quantity: number;
  price: number;
  label: string;
}

/**
 * Converte a lista de faixas (cada uma é "a partir de X un., preço Y/un.")
 * em faixas com limite superior pra exibição, ex: "1-9 un — R$15,00/un",
 * "50+ un — R$9,50/un" pra última faixa. Ordena por quantidade sempre,
 * já que o cadastro em PriceTierEditor não garante ordem.
 */
export function buildPriceTierRanges(tiers: PriceTier[]): PriceTierRange[] {
  const withIndex = tiers.map((t, originalIndex) => ({ ...t, originalIndex }));
  const sorted = [...withIndex].sort((a, b) => a.quantity - b.quantity);

  return sorted.map((tier, i) => {
    const next = sorted[i + 1];
    const label = next
      ? `${tier.quantity}-${next.quantity - 1} un — ${formatBRL(tier.price)}/un`
      : `${tier.quantity}+ un — ${formatBRL(tier.price)}/un`;
    return { originalIndex: tier.originalIndex, quantity: tier.quantity, price: tier.price, label };
  });
}
