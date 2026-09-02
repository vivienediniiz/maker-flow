'use client';

/**
 * Hook para rastrear eventos de conversão no Google Analytics 4
 *
 * Uso:
 *   const { trackSignup, trackPayment } = useAnalytics();
 *   trackSignup({ tier: 'monthly' });
 *   trackPayment({ amount: 29.90, currency: 'BRL' });
 */
export function useAnalytics() {
  const gtag = typeof window !== 'undefined' ? (window as any).gtag : null;

  return {
    /**
     * Rastreia novo cadastro
     */
    trackSignup: (params?: { tier?: string; referrer?: string }) => {
      if (!gtag) return;
      gtag('event', 'sign_up', {
        method: 'email',
        tier: params?.tier,
        referrer: params?.referrer,
      });
    },

    /**
     * Rastreia pagamento bem-sucedido
     */
    trackPayment: (params: { amount: number; currency?: string; tier?: string; method?: string }) => {
      if (!gtag) return;
      gtag('event', 'purchase', {
        value: params.amount,
        currency: params.currency || 'BRL',
        items: [
          {
            item_name: params.tier || 'subscription',
            price: params.amount,
          },
        ],
        payment_type: params.method || 'unknown',
      });
    },

    /**
     * Rastreia início de checkout
     */
    trackCheckoutStart: (params: { tier?: string; method?: string }) => {
      if (!gtag) return;
      gtag('event', 'begin_checkout', {
        value: 0,
        currency: 'BRL',
        items: [{ item_name: params.tier || 'subscription' }],
      });
    },

    /**
     * Rastreia visualização de página
     */
    trackPageView: (params?: { page_path?: string; page_title?: string }) => {
      if (!gtag) return;
      gtag('event', 'page_view', {
        page_path: params?.page_path || window.location.pathname,
        page_title: params?.page_title || document.title,
      });
    },

    /**
     * Rastreia evento customizado
     */
    trackEvent: (eventName: string, eventData?: Record<string, any>) => {
      if (!gtag) return;
      gtag('event', eventName, eventData || {});
    },
  };
}
