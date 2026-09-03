import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `printer_assets.invoice_url` guardava a URL pública fixa do bucket
 * `printer-invoices` (bucket era público, expondo nota fiscal — dado
 * financeiro — pra qualquer pessoa sem login). Depois da correção o bucket
 * é privado e passamos a guardar só o caminho do arquivo, gerando uma URL
 * assinada (expira sozinha) na hora de abrir. Isso extrai o caminho tanto
 * do formato novo (só o path) quanto do formato antigo (URL pública
 * completa, já salva em registros de antes da correção) — sem precisar de
 * backfill no banco.
 */
export function extractInvoicePath(stored: string): string {
  const marker = "/printer-invoices/";
  const idx = stored.indexOf(marker);
  if (idx === -1) return stored; // já é só o path (upload feito depois da correção)
  return decodeURIComponent(stored.slice(idx + marker.length).split("?")[0]);
}

export async function getSignedInvoiceUrl(supabase: SupabaseClient, stored: string): Promise<string | null> {
  const path = extractInvoicePath(stored);
  const { data, error } = await supabase.storage.from("printer-invoices").createSignedUrl(path, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}
