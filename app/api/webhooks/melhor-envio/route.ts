import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook do Melhor Envio (mudança de status de envio). Stub deliberado:
 * o Melhor Envio testa essa URL de forma síncrona no momento em que ela é
 * cadastrada no painel deles — sem responder 200 aqui, o cadastro do webhook
 * falha com 404 antes mesmo da integração OAuth existir. A lógica real
 * (localizar a quote pelo shipping_service_id/tracking code e atualizar o
 * status) entra depois, sem mudar essa URL nem o cadastro já feito no painel.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(_req: NextRequest) {
  // TODO: validar autenticidade do evento, extrair o id do envio, localizar
  // a quote correspondente via shipping_service_id e atualizar o status.
  return NextResponse.json({ ok: true });
}
