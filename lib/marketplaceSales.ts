import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuoteStatus } from "./types";

/** Status que um marketplace consegue ditar pra uma venda importada. */
export type MarketplaceStatus = "paid" | "cancelled";

/**
 * Decide o status final de uma venda já existente quando o marketplace
 * informa `incoming`. O marketplace manda no cancelamento, mas NÃO pode
 * desfazer o andamento que o maker marcou no StudioMaker (Em produção,
 * Enviado): "pago" só vale a partir de orçamento/aguardando pagamento/expirado.
 */
export function resolveMarketplaceStatus(current: QuoteStatus, incoming: MarketplaceStatus): QuoteStatus {
  if (incoming === "cancelled") return "cancelled";
  return current === "sent" || current === "awaiting_payment" || current === "expired" ? "paid" : current;
}

export interface MarketplaceSale {
  /** Linha completa de `quotes`, usada só quando a venda ainda não existe. */
  row: { user_id: string; source: string; external_order_id: string; status: MarketplaceStatus } & Record<string, unknown>;
}

export interface SaveSalesResult {
  inserted: number;
  updated: number;
  unchanged: number;
}

/**
 * Grava vendas vindas de um marketplace sem destruir edições do maker:
 *  - pedido novo: insere a linha completa;
 *  - pedido já existente: só ajusta `status` (ver resolveMarketplaceStatus) —
 *    produto vinculado, custo, cliente e observações ficam como estão.
 * Idempotente: rodar de novo (webhook repetido, reconciliação diária) não
 * duplica nem sobrescreve. Todas as vendas do lote precisam ser do mesmo
 * usuário e da mesma origem.
 */
export async function saveMarketplaceSales(admin: SupabaseClient, sales: MarketplaceSale[]): Promise<SaveSalesResult> {
  if (sales.length === 0) return { inserted: 0, updated: 0, unchanged: 0 };

  const { user_id: userId, source } = sales[0].row;
  const ids = sales.map((s) => s.row.external_order_id);

  const { data: existing, error: readError } = await admin
    .from("quotes")
    .select("id, external_order_id, status")
    .eq("user_id", userId)
    .eq("source", source)
    .in("external_order_id", ids);
  if (readError) throw new Error(readError.message);

  const byOrder = new Map((existing ?? []).map((q) => [q.external_order_id as string, q]));
  const toInsert = sales.filter((s) => !byOrder.has(s.row.external_order_id)).map((s) => s.row);

  let inserted = 0;
  if (toInsert.length > 0) {
    // ignoreDuplicates: se um webhook inserir o mesmo pedido entre a leitura
    // acima e esta escrita, o conflito é ignorado em vez de sobrescrever.
    const { data, error } = await admin
      .from("quotes")
      .upsert(toInsert, { onConflict: "user_id,source,external_order_id", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    inserted = data?.length ?? toInsert.length;
  }

  let updated = 0;
  let unchanged = 0;
  for (const sale of sales) {
    const current = byOrder.get(sale.row.external_order_id);
    if (!current) continue;
    const next = resolveMarketplaceStatus(current.status as QuoteStatus, sale.row.status);
    if (next === current.status) {
      unchanged++;
      continue;
    }
    const { error } = await admin.from("quotes").update({ status: next }).eq("id", current.id);
    if (error) throw new Error(error.message);
    updated++;
  }

  return { inserted, updated, unchanged };
}
