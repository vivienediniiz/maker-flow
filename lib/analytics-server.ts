/**
 * Rastreamento de eventos GA4 no servidor
 * Usa Google Analytics Measurement Protocol pra enviar eventos
 */

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET; // Configurar no Netlify

/**
 * Envia evento de pagamento aprovado ao GA4
 * Chamado quando Pix ou Cartão é confirmado no webhook
 */
export async function trackPaymentServer(params: {
  userId: string;
  amount: number;
  currency?: string;
  tier?: string;
  method?: string;
}) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    console.warn('GA4 não configurado no servidor — trackPaymentServer ignorado');
    return;
  }

  try {
    // Google Analytics Measurement Protocol v2
    const response = await fetch('https://www.google-analytics.com/mp/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_version: '2',
        measurement_id: GA4_MEASUREMENT_ID,
        api_secret: GA4_API_SECRET,
        events: [
          {
            name: 'purchase',
            params: {
              user_id: params.userId,
              value: params.amount,
              currency: params.currency || 'BRL',
              transaction_id: `${params.userId}-${Date.now()}`,
              items: [
                {
                  item_name: params.tier || 'subscription',
                  price: params.amount,
                },
              ],
              payment_type: params.method || 'unknown',
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[GA4] Falha ao enviar evento de pagamento:', response.statusText);
    }
  } catch (err) {
    console.error('[GA4] Erro ao rastrear pagamento:', err);
  }
}
