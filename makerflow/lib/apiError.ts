import { NextResponse } from "next/server";

/**
 * Loga o erro real no servidor (nunca chega no cliente) e devolve uma
 * mensagem genérica — evita vazar detalhe interno (erro cru do Mercado
 * Pago/Melhor Envio/Supabase, nome de campo, versão de lib) pra quem está
 * do outro lado da API, seja um cliente com problema de rede, seja alguém
 * sondando a aplicação.
 */
export function apiError(context: string, err: unknown, genericMessage: string, status = 502) {
  console.error(`[${context}]`, err instanceof Error ? err.message : err);
  return NextResponse.json({ error: genericMessage }, { status });
}
