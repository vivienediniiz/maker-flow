import type { Metadata, Viewport } from "next";
import { Exo_2 } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";

const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

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
    <html
      lang="pt-BR"
      className={`dark ${exo2.className}`}
      style={{
        ...exo2.style,
        fontFamily: "Exo 2, system-ui, sans-serif",
      } as React.CSSProperties}
    >
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}