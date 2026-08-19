/** Comissão só na primeira cobrança de quem foi indicado — nunca em renovações. */
export const AFFILIATE_COMMISSION_RATE = 0.3;

/** Base64url de bytes aleatórios — curto, sem caracteres ambíguos de URL. */
export function generateAffiliateCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function buildAffiliateLink(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/signup?ref=${code}`;
}

/** Chave de sessionStorage usada pra carregar o `?ref=` da página de Signup até depois do redirect do login social (Google). */
export const AFFILIATE_REF_STORAGE_KEY = "studiomaker_ref_code";
