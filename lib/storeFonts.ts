/**
 * Lista curada de fontes de título pra Loja Online — só Google Fonts, sem
 * upload customizado (carrega mais rápido e mantém aparência consistente).
 * `googleFamily` é o parâmetro usado na URL do Google Fonts; `cssFamily` é o
 * valor pronto pra `font-family` (com fallback genérico).
 */
export interface StoreFontOption {
  value: string;
  label: string;
  googleFamily: string;
  cssFamily: string;
}

export const STORE_TITLE_FONTS: StoreFontOption[] = [
  {
    value: "poppins",
    label: "Poppins",
    googleFamily: "Poppins:wght@600;700;800",
    cssFamily: "'Poppins', system-ui, sans-serif",
  },
  {
    value: "playfair-display",
    label: "Playfair Display",
    googleFamily: "Playfair+Display:wght@600;700;800",
    cssFamily: "'Playfair Display', Georgia, serif",
  },
  {
    value: "fraunces",
    label: "Fraunces",
    googleFamily: "Fraunces:wght@600;700;800",
    cssFamily: "'Fraunces', Georgia, serif",
  },
  {
    value: "dm-serif-display",
    label: "DM Serif Display",
    googleFamily: "DM+Serif+Display",
    cssFamily: "'DM Serif Display', Georgia, serif",
  },
  {
    value: "montserrat",
    label: "Montserrat",
    googleFamily: "Montserrat:wght@600;700;800",
    cssFamily: "'Montserrat', system-ui, sans-serif",
  },
];

export const DEFAULT_STORE_FONT = STORE_TITLE_FONTS[0];

export function getStoreFont(value: string | null | undefined): StoreFontOption {
  return STORE_TITLE_FONTS.find((f) => f.value === value) ?? DEFAULT_STORE_FONT;
}

/** URL única do Google Fonts com todas as fontes curadas — carregada uma vez no layout da loja pública. */
export function buildStoreFontsStylesheetUrl(): string {
  const families = STORE_TITLE_FONTS.map((f) => `family=${f.googleFamily}`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

export const DEFAULT_STORE_PRIMARY_COLOR = "#FF4EDF";
export const DEFAULT_STORE_SECONDARY_COLOR = "#0B0914";
