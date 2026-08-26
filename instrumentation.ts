import * as Sentry from "@sentry/nextjs";

/**
 * `null` até NEXT_PUBLIC_SENTRY_DSN ser configurado (Netlify → Environment
 * variables) — sem isso, o app funciona normal, só sem monitoramento. O DSN
 * do Sentry não é segredo (é uma chave pública, protegida por allowlist de
 * domínio no lado do Sentry, o mesmo motivo pelo qual usa o prefixo
 * NEXT_PUBLIC_ — precisa estar disponível no navegador também).
 *
 * captureConsoleIntegration com level "error" captura automaticamente todo
 * console.error já existente no código (ex: lib/apiError.ts, rate limit,
 * webhooks) — sem precisar tocar em cada chamada de novo.
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
