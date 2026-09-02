import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://studiomaker3d.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "StudioMaker — Gestão para Makers e Estúdios 3D",
  description:
    "Precificação inteligente, gestão de pedidos e automação para a comunidade Maker e estúdios de Impressão 3D.",
  manifest: "/manifest.json",
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
    <html lang="pt-BR" className="dark">
      <head>
        {/* Exo 2 — headings (h1-h3, font-display) · Chakra Petch — numeric/KPI values (font-numeric)
            Montserrat — body/UI text (font-sans) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Exo+2:wght@500;600;700;800&family=Chakra+Petch:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}