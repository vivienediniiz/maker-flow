import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { StoreProfilePublic } from "@/lib/types";

export const dynamic = "force-dynamic";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Resumo público de um checkout, pra tela de confirmação de pedido — usa o
 * client admin porque `store_checkouts` tem RLS sem nenhuma policy (só
 * service_role acessa). Retorna só o necessário pra mostrar o resumo ao
 * próprio comprador que acabou de finalizar a compra (itens, total, status),
 * nunca o objeto inteiro (sem endereço/telefone do comprador).
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const admin = adminClient();
  const checkoutId = req.nextUrl.searchParams.get("checkout_id");
  if (!checkoutId) {
    return NextResponse.json({ error: "checkout_id é obrigatório." }, { status: 400 });
  }

  const { data: seller } = await admin
    .from("store_profiles_public")
    .select("*")
    .eq("store_slug", params.slug)
    .maybeSingle();
  const sellerProfile = seller as StoreProfilePublic | null;
  if (!sellerProfile) {
    return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
  }

  const { data: checkout } = await admin
    .from("store_checkouts")
    .select("id, seller_user_id, status, items, total_amount, created_at")
    .eq("id", checkoutId)
    .eq("seller_user_id", sellerProfile.user_id)
    .maybeSingle();

  if (!checkout) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    id: checkout.id,
    status: checkout.status,
    items: checkout.items,
    total_amount: checkout.total_amount,
    created_at: checkout.created_at,
  });
}
