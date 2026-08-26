import type { ReactNode } from "react";
import { buildStoreFontsStylesheetUrl } from "@/lib/storeFonts";

/**
 * Layout próprio da Loja Online — só carrega as fontes curadas de título
 * (Google Fonts) nessa rota, sem herdar a identidade visual do painel
 * StudioMaker3D (Exo 2/Chakra Petch, gradiente neon fixo).
 */
export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={buildStoreFontsStylesheetUrl()} />
      {children}
    </>
  );
}
