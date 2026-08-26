const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
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
