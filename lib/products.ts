import type { Product } from "./types";

/**
 * Diferente do filamento (que tem um padrão universal de 150g/15%), o
 * estoque de produto varia demais de negócio pra negócio — só sinaliza
 * baixo quando o maker configurou um limite explícito pra aquele produto.
 */
export function isProductLow(p: Pick<Product, "stock_quantity" | "low_stock_threshold">) {
  if (p.low_stock_threshold == null) return false;
  return p.stock_quantity <= p.low_stock_threshold;
}
