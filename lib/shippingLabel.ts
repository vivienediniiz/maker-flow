import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateMelhorEnvioLabel,
  fetchMelhorEnvioCartItem,
  printMelhorEnvioLabel,
} from "@/lib/melhorEnvio";

/**
 * Server-only: carrega tudo que as rotas de compra/etiqueta de frete
 * precisam (venda, cliente, perfil, integração), sempre confirmando que a
 * venda pertence ao usuário autenticado — nunca confia em `quoteId` sozinho.
 */
export async function loadShippingContext(admin: SupabaseClient, userId: string, quoteId: string) {
  const { data: quote } = await admin
    .from("quotes")
    .select(
      "id, user_id, client_id, project_name, final_price, weight_g, shipping_service_id, shipping_label_status, shipping_label_url"
    )
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!quote) return { error: "Venda não encontrada." as const };
  if (!quote.client_id) return { error: "Essa venda não tem cliente vinculado — cadastre um antes de comprar o frete." as const };

  const [{ data: client }, { data: profile }, { data: integration }] = await Promise.all([
    admin
      .from("clients")
      .select("name, phone, document, street, number, complement, neighborhood, city, state, cep")
      .eq("id", quote.client_id)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("studio_name, full_name, phone, document, street, street_number, complement, neighborhood, city, state, cep")
      .eq("id", userId)
      .single(),
    admin
      .from("integrations")
      .select("id, credential_secret_id, status")
      .eq("user_id", userId)
      .eq("platform", "melhor_envio")
      .maybeSingle(),
  ]);

  if (!client) return { error: "Cliente dessa venda não encontrado." as const };
  if (!integration || integration.status !== "connected" || !integration.credential_secret_id) {
    return { error: "Conecte sua conta do Melhor Envio em Integrações antes de comprar frete." as const };
  }

  return { quote, client, profile: profile!, integration };
}

export interface GenerateResult {
  generatedAt: string;
  labelUrl: string | null;
  trackingCode: string | null;
}

/**
 * Gera a etiqueta e, de forma best-effort (nunca derruba a chamada
 * principal), já busca a URL do PDF e tenta capturar o código de rastreio —
 * ambos podem legitimamente não estar disponíveis ainda logo após gerar.
 */
export async function generateAndFetchLabel(
  admin: SupabaseClient,
  integration: { id: string; credential_secret_id: string | null },
  orderId: string
): Promise<GenerateResult> {
  await generateMelhorEnvioLabel(admin, integration, orderId);

  let labelUrl: string | null = null;
  let trackingCode: string | null = null;

  try {
    labelUrl = await printMelhorEnvioLabel(admin, integration, orderId, "pdf");
  } catch {
    // Sem problema — fica disponível pra buscar de novo no botão "Imprimir Etiqueta".
  }

  try {
    const item = await fetchMelhorEnvioCartItem(admin, integration, orderId);
    trackingCode = item.tracking;
  } catch {
    // Rastreio pode não estar disponível ainda (só aparece quando a transportadora posta o envio).
  }

  return { generatedAt: new Date().toISOString(), labelUrl, trackingCode };
}
