const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================================================
  // TYPESCRIPT
  // ============================================================================
  typescript: { ignoreBuildErrors: true },

  // ============================================================================
  // IMAGE OPTIMIZATION — Core Web Vitals
  // ============================================================================
  images: {
    formats: ["image/avif", "image/webp"], // ✅ Automático conversion
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co", // ✅ Supabase images
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false, // ✅ Security
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ============================================================================
  // COMPRESSION & CACHING
  // ============================================================================
  compress: true, // ✅ gzip/brotli automático

  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  // ============================================================================
  // EXPERIMENTAL FEATURES FOR PERFORMANCE
  // ============================================================================
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
    optimizePackageImports: [
      "@supabase/supabase-js",
      "framer-motion",
      "recharts",
      "lucide-react",
    ], // ✅ Auto code-split
  },

  // ============================================================================
  // CACHE HEADERS
  // ============================================================================
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-cache" }], // ✅ APIs não cacheadas
      },
      {
        source: "/_next/image(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ], // ✅ 1 ano (images otimizadas)
      },
      {
        source: "/_next/static(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ], // ✅ 1 ano (static assets)
      },
    ];
  },

  // ============================================================================
  // REDIRECTS (existentes)
  // ============================================================================
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

  // ============================================================================
  // SWC MINIFY (padrão, mas deixa explícito)
  // ============================================================================
  swcMinify: true,
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
  widenClientFileUpload: false, // ✅ CHANGED: Não suba sourcemaps automáticos (use CI)
  disableLogger: true,
  automaticVercelMonitors: false,
});
