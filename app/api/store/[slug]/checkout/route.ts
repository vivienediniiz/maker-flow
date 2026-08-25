import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createMercadoPagoPreferenceForIntegration } from "@/lib/mercadoPago";
import { createInfinitePayCheckoutLink } from "@/lib/infinitePay";
import type { StoreProfilePublic } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";
// Único vendedor autorizado a usar InfinitePay — handle não é secreto (a
// própria InfinitePay trata como público), mas o botão só aparece/funciona
// pra essa loja específica, pra não desviar pagamento de outro vendedor pra
// essa conta (a Loja Online é multi-tenant, InfinitePay hoje não é).
const INFINITEPAY_STORE_SLUG = process.env.NEXT_PUBLIC_INFINITEPAY_STORE_SLUG;
const INFINITEPAY_HANDLE = process.env.INFINITEPAY_HANDLE;

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

interface CheckoutBuyerInput {
  name: string;
  email: string;
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

/**
 * Checkout público da Loja Online — sem autenticação. Recalcula preços a
 * partir do banco (nunca confia no que o navegador manda), cria o snapshot
 * em `store_checkouts` e abre uma preferência de Checkout Pro na conta MP do
 * próprio vendedor. A confirmação de pagamento chega depois pelo webhook já
 * existente (`/api/webhooks/mercado-pago`), que lê `external_reference` de
 * volta pra achar esse checkout.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const admin = adminClient();
  const { slug } = params;

  const body = await req.json().catch(() => null);
  const items: CheckoutItemInput[] = Array.isArray(body?.items) ? body.items : [];
  const buyer: CheckoutBuyerInput | null = body?.buyer ?? null;
  const paymentMethod: "mercado_pago" | "infinitepay" = body?.paymentMethod === "infinitepay" ? "infinitepay" : "mercado_pago";

  if (paymentMethod === "infinitepay" && (!INFINITEPAY_HANDLE || slug !== INFINITEPAY_STORE_SLUG)) {
    return NextResponse.json({ error: "InfinitePay não está disponível pra essa loja." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }
  if (!buyer?.name?.trim() || !buyer?.email?.trim()) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  const { data: seller } = await admin
    .from("store_profiles_public")
    .select("*")
    .eq("store_slug", slug)
    .maybeSingle();

  const sellerProfile = seller as StoreProfilePublic | null;
  if (!sellerProfile || !sellerProfile.store_enabled || !sellerProfile.payment_ready) {
    return NextResponse.json({ error: "Loja indisponível no momento." }, { status: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const { data: products } = await admin
    .from("products")
    .select("id, name, sale_price")
    .eq("user_id", sellerProfile.user_id)
    .eq("in_store", true)
    .in("id", productIds);

  const productsById = new Map((products ?? []).map((p) => [p.id, p]));

  const checkoutItems = items
    .map((item) => {
      const product = productsById.get(item.productId);
      const quantity = Math.max(1, Math.floor(item.quantity) || 1);
      if (!product) return null;
      return { product_id: product.id, name: product.name, unit_price: product.sale_price, quantity };
    })
    .filter((i): i is { product_id: string; name: string; unit_price: number; quantity: number } => i !== null);

  if (checkoutItems.length === 0) {
    return NextResponse.json({ error: "Nenhum produto do carrinho está disponível." }, { status: 400 });
  }

  const totalAmount = checkoutItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const { data: checkout, error: checkoutError } = await admin
    .from("store_checkouts")
    .insert({
      seller_user_id: sellerProfile.user_id,
      status: "pending",
      payment_provider: paymentMethod,
      buyer_name: buyer.name.trim(),
      buyer_email: buyer.email.trim(),
      buyer_phone: buyer.phone || null,
      buyer_cep: buyer.cep || null,
      buyer_street: buyer.street || null,
      buyer_number: buyer.number || null,
      buyer_complement: buyer.complement || null,
      buyer_neighborhood: buyer.neighborhood || null,
      buyer_city: buyer.city || null,
      buyer_state: buyer.state || null,
      items: checkoutItems,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (checkoutError || !checkout) {
    return NextResponse.json({ error: checkoutError?.message ?? "Falha ao iniciar o checkout." }, { status: 500 });
  }

  if (paymentMethod === "infinitepay") {
    try {
      const link = await createInfinitePayCheckoutLink({
        handle: INFINITEPAY_HANDLE!,
        items: checkoutItems.map((i) => ({
          quantity: i.quantity,
          price: Math.round(i.unit_price * 100),
          description: i.name,
        })),
        order_nsu: checkout.id,
        redirect_url: `${SITE_URL}/loja/${slug}?pedido=sucesso`,
        webhook_url: `${SITE_URL}/api/webhooks/infinitepay`,
        customer: { name: buyer.name.trim(), email: buyer.email.trim(), phone_number: buyer.phone || undefined },
      });

      await admin.from("store_checkouts").update({ infinitepay_order_nsu: checkout.id }).eq("id", checkout.id);

      return NextResponse.json({ init_point: link.url });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }
  }

  const { data: integration } = await admin
    .from("integrations")
    .select("id, credential_secret_id")
    .eq("user_id", sellerProfile.user_id)
    .eq("platform", "mercado_pago")
    .eq("status", "connected")
    .maybeSingle();

  if (!integration || !integration.credential_secret_id) {
    return NextResponse.json({ error: "Loja sem pagamento configurado no momento." }, { status: 400 });
  }

  try {
    const preference = await createMercadoPagoPreferenceForIntegration(admin, integration, {
      items: checkoutItems.map((i) => ({
        title: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: "BRL",
      })),
      payer: { name: buyer.name.trim(), email: buyer.email.trim() },
      external_reference: checkout.id,
      notification_url: `${SITE_URL}/api/webhooks/mercado-pago`,
      back_urls: {
        success: `${SITE_URL}/loja/${slug}?pedido=sucesso`,
        failure: `${SITE_URL}/loja/${slug}?pedido=falha`,
        pending: `${SITE_URL}/loja/${slug}?pedido=pendente`,
      },
      auto_return: "approved",
    });

    await admin.from("store_checkouts").update({ mp_preference_id: preference.id }).eq("id", checkout.id);

    return NextResponse.json({ init_point: preference.init_point });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
