export interface ViaCepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function cepDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Busca endereço pelo CEP via ViaCEP. Retorna null se o CEP não existir. */
export async function fetchAddressByCep(cep: string): Promise<ViaCepAddress | null> {
  const digits = cepDigits(cep);
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!res.ok) throw new Error("Falha ao consultar o CEP");

  const data = await res.json();
  if (data.erro) return null;

  return {
    street: data.logradouro || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
  };
}
