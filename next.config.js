const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async redirects() {
    return [
      // A landing morava em /home antes de mudar pra raiz. Fica aqui, e não
      // numa page.tsx com redirect(): a rota era estática, e o 308 gerado
      // por ela chegava em produção sem o cabeçalho Location — o navegador
      // recebia "mudou de endereço" e nenhum endereço. Redirecionamento de
      // URL é configuração, não página.
      { source: "/home", destination: "/", permanent: true },
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
