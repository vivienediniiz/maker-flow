import { createClient } from "@/lib/supabase/client";

/**
 * Helper para queries de vendas com soft-delete
 * Todos os SELECTs em quotes devem excluir registros com deleted_at
 */

export async function getActiveQuotesQuery(supabase: ReturnType<typeof createClient>) {
  // Base query excludes soft-deleted records
  return supabase
    .from("quotes")
    .select("*")
    .is("deleted_at", null); // Only active records
}

export async function getQuoteById(supabase: ReturnType<typeof createClient>, id: string) {
  return supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null) // Exclude soft-deleted
    .maybeSingle();
}

export async function softDeleteQuote(supabase: ReturnType<typeof createClient>, id: string) {
  return supabase
    .from("quotes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

export async function restoreQuote(supabase: ReturnType<typeof createClient>, id: string) {
  return supabase
    .from("quotes")
    .update({ deleted_at: null })
    .eq("id", id);
}
