const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://api.anthropic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.supabase.co https://api.mercadopago.com https://*.mux.com; frame-ancestors 'none'; upgrade-insecure-requests" },
        ],
      },
    ];
  },
};

// Sem isso, instrumentation-client.ts nunca é injetado no bundle do
// navegador — o SDK do Sentry no client fica com o arquivo criado mas
// nunca carregado de verdade. Sem SENTRY_AUTH_TOKEN configurado, só pula o
// upload de source maps (não quebra o build, só fica sem stack trace
// bonito no painel do Sentry).
module.exports = withSentryConfig(nextConfig, {
  org: "viviene-diniz",
  project: "studio-maker",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
