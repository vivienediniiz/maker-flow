/**
 * Escapa texto que vai virar HTML por string (container.innerHTML = `...`).
 * Necessário pra qualquer dado que não passou por validação no momento em
 * que entrou no banco — em especial `clients.name`/`address`/`phone` e
 * `quotes.buyer_name`, que podem ter sido gravados pelo checkout público da
 * Loja Online antes da validação em app/api/store/[slug]/checkout/route.ts.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
