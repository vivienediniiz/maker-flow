import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

interface MpFeeDetail {
  amount: number;
}

interface MpPayment {
  id: number;
  status: string;
  transaction_amount: number;
  date_created: string;
  fee_details?: MpFeeDetail[];
  payer?: { first_name?: string; last_name?: string; email?: string };
  description?: string;
  additional_info?: { items?: { title?: string }[] };
}

export async function fetchMercadoPagoPayment(accessToken: string, paymentId: string): Promise<MpPayment> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago respondeu ${res.status} ao buscar o pagamento ${paymentId}`);
  }
  return res.json();
}

/**
 * Só cria/atualiza a venda quando o pagamento está aprovado - pendente/rejeitado
 * não vira registro em `quotes` (evita poluir Vendas com tentativas não concluídas).
 * Idempotente via unique index (user_id, source, external_order_id): reprocessar
 * o mesmo pagamento (retry de webhook, ou "Sincronizar") faz upsert, não duplica.
 */
export async function upsertQuoteFromMercadoPagoPayment(
  admin: SupabaseClient,
  userId: string,
  payment: MpPayment
) {
  if (payment.status !== "approved") return null;

  const platformFee = (payment.fee_details ?? []).reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const buyerName =
    [payment.payer?.first_name, payment.payer?.last_name].filter(Boolean).join(" ").trim() ||
    payment.payer?.email ||
    null;
  const productName = payment.additional_info?.items?.[0]?.title || payment.description || "Venda Mercado Pago";

  const { data, error } = await admin
    .from("quotes")
    .upsert(
      {
        user_id: userId,
        project_name: productName,
        final_price: payment.transaction_amount,
        platform_fee: platformFee,
        cost_amount: 0,
        status: "paid",
        source: "mercado_pago",
        external_order_id: String(payment.id),
        buyer_name: buyerName,
        sent_at: payment.date_created,
        client_id: null,
        product_id: null,
        weight_g: 0,
        print_time_min: 0,
        energy_cost: 0,
        filament_cost: 0,
        margin_percent: 0,
      },
      { onConflict: "user_id,source,external_order_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Valida a assinatura HMAC que o Mercado Pago manda no header x-signature,
 * conforme o formato documentado (ts + v1 separados por vírgula). Só roda se
 * a integração tiver um webhook_secret configurado (opcional) - sem ele, a
 * defesa real continua sendo "nunca confiar no payload, sempre reconsultar
 * a API do MP com o access token guardado" (feito em fetchMercadoPagoPayment).
 */
export function validateMercadoPagoSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!params.xSignature || !params.dataId) return false;

  const parts: Record<string, string> = {};
  for (const chunk of params.xSignature.split(",")) {
    const [key, value] = chunk.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${params.dataId.toLowerCase()};request-id:${params.xRequestId ?? ""};ts:${ts};`;
  const expected = crypto.createHmac("sha256", params.secret).update(manifest).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(v1);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}
