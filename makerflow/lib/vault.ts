import type { SupabaseClient } from "@supabase/supabase-js";

// Wrappers pras funções `security definer` que envolvem o Supabase Vault
// (ver migration integration_vault_functions). Só funcionam com um client
// autenticado como service_role — nunca chame isso a partir de código que
// roda no browser.

export async function setIntegrationCredential(
  admin: SupabaseClient,
  secretId: string | null,
  value: string,
  name: string
): Promise<string> {
  const { data, error } = await admin.rpc("integration_set_credential", {
    p_secret_id: secretId,
    p_new_value: value,
    p_name: name,
  });
  if (error || !data) throw new Error(error?.message ?? "Falha ao salvar credencial no Vault");
  return data as string;
}

export async function getIntegrationCredential(admin: SupabaseClient, secretId: string): Promise<string | null> {
  const { data, error } = await admin.rpc("integration_get_credential", { p_secret_id: secretId });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function deleteIntegrationCredential(admin: SupabaseClient, secretId: string): Promise<void> {
  const { error } = await admin.rpc("integration_delete_credential", { p_secret_id: secretId });
  if (error) throw new Error(error.message);
}
