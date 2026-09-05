import type { Metadata, Viewport } from "next";
import { Montserrat, Exo_2, Chakra_Petch } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { SchemaOrg } from "@/components/SchemaOrg";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  variable: "--font-numeric",
  weight: ["500", "600", "700"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://studiomaker3d.com.br";

/**
 * ✅ Comprehensive metadata for agents
 * Includes: canonical, og:type, og:image, robots, schema.org
 */
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "StudioMaker — Gestão para Makers e Estúdios 3D",
  description:
    "Precificação inteligente, gestão de pedidos e automação para a comunidade Maker e estúdios de Impressão 3D.",
  keywords: [
    "3D printing",
    "studio management",
    "inventory tracking",
    "pricing automation",
    "impressão 3D",
    "gestão de estúdio",
    "automação de preços",
  ],
  canonical: APP_URL,
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudioMaker",
  },
  openGraph: {
    title: "StudioMaker — Gestão para Makers e Estúdios 3D",
    description:
      "Precificação inteligente, gestão de pedidos e automação para a comunidade Maker e estúdios de Impressão 3D.",
    url: APP_URL,
    siteName: "StudioMaker",
    images: [
      {
        url: "/og",
        width: 1200,
        height: 630,
        alt: "StudioMaker — Gestão para estúdios 3D",
        type: "image/png",
      },
    ],
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#AA17DB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${montserrat.variable} ${exo2.variable} ${chakraPetch.variable}`}
    >
      <head>
        {/* ✅ Schema.org structured data for agents */}
        <SchemaOrg />
      </head>
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}