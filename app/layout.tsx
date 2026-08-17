import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioMaker — Gestão para Makers e Estúdios 3D",
  description:
    "Precificação inteligente, gestão de pedidos e automação para a comunidade Maker e estúdios de Impressão 3D.",
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