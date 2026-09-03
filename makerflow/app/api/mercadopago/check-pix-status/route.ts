import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decodeExternalReference } from "@/lib/plans";

/**
 * Consulta o status de um pagamento Pix no Mercado Pago.
 *
 * O modal de checkout (components/marketing/PixCheckoutModal.tsx) chama isso a
 * cada 3s enquanto o QR code está na tela, pra trocar "Aguardando confirmação"
 * por "Pagamento aprovado" no segundo em que o Pix cai — sem depender do
 * webhook, que é quem libera o plano de fato mas não tem como avisar a aba
 * aberta.
 *
 * Só lê. Quem escreve no perfil é /api/webhooks/mercadopago.
 */
export async function GET(req: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado no servidor." }, { status: 500 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "É preciso estar autenticado." }, { status: 401 });
  }

  const paymentId = req.nextUrl.searchParams.get("paymentId");
  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return NextResponse.json({ error: "paymentId inválido." }, { status: 400 });
  }

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!mpRes.ok) {
    console.error("[mercadopago check-pix-status] falha ao consultar pagamento", paymentId, mpRes.status);
    return NextResponse.json({ error: "Falha ao consultar o Mercado Pago." }, { status: 502 });
  }

  const payment = await mpRes.json();

  // O id do pagamento é sequencial e adivinhável: sem esta checagem, qualquer
  // usuário logado leria o status de pagamento de outro.
  const rawRef: string | undefined = payment.external_reference;
  const ownerId = rawRef?.includes("|") ? decodeExternalReference(rawRef).userId : null;
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ status: payment.status, statusDetail: payment.status_detail ?? null }, { status: 200 });
}
