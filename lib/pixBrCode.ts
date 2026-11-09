/**
 * Gerador do "Pix Copia e Cola" (BR Code estático, padrão EMV® do Banco
 * Central): o pagamento cai direto na chave do lojista, sem intermediário.
 * Não confirma pagamento sozinho — quem recebe confere no próprio banco.
 */

/** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) exigido no fim do BR Code. */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** Maiúsculas, sem acento e só caracteres ASCII imprimíveis — o BR Code não aceita mais que isso em nome/cidade. */
function asciiUpper(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

export interface PixPayloadInput {
  key: string;
  holderName: string;
  city: string;
  /** Valor em reais; omitido/0 gera um Pix em que o pagador digita o valor. */
  amount?: number;
  /** Identificador da cobrança (até 25 letras/números) — ajuda o lojista a achar o pagamento no extrato. */
  txid?: string;
}

export function buildPixPayload({ key, holderName, city, amount, txid }: PixPayloadInput): string {
  const cleanTxid = (txid ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", key.trim());

  let payload =
    field("00", "01") +
    field("01", "11") +
    field("26", merchantAccount) +
    field("52", "0000") +
    field("53", "986");
  if (amount && amount > 0) payload += field("54", amount.toFixed(2));
  payload +=
    field("58", "BR") +
    field("59", asciiUpper(holderName, 25) || "LOJA") +
    field("60", asciiUpper(city, 15) || "BRASIL") +
    field("62", field("05", cleanTxid)) +
    "6304";

  return payload + crc16(payload);
}

/** Aceita CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória; devolve a chave normalizada ou null se for inválida. */
export function normalizePixKey(raw: string): string | null {
  const key = raw.trim();
  if (!key) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return key.toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) && key.length <= 77) return key.toLowerCase();
  if (/^\+55\d{10,11}$/.test(key)) return key;
  const digits = key.replace(/[.\-/\s()]/g, "");
  if (/^\d{11}$/.test(digits) || /^\d{14}$/.test(digits)) return digits; // CPF / CNPJ
  return null;
}
