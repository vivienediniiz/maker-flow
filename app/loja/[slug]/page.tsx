"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";
import { formatBRL } from "@/lib/utils";
import { CheckoutForm } from "./CheckoutForm";
import { OrderTracking, type OrderSummary } from "./OrderTracking";
import { BannerSlideshow } from "./BannerSlideshow";
import { CategoryNav } from "./CategoryNav";
import { ProductModal } from "./ProductModal";
import { WhatsAppFloatingButton } from "./WhatsAppFloatingButton";
import { getStoreFont, DEFAULT_STORE_PRIMARY_COLOR, DEFAULT_STORE_SECONDARY_COLOR, DEFAULT_STORE_TITLE_COLOR } from "@/lib/storeFonts";
import { ShoppingCart, Plus, Minus, Trash2, Store, Loader2 } from "lucide-react";
import type { StoreProductPublic, StoreProfilePublic, StoreBannerPublic } from "@/lib/types";

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  customization?: string | null;
}

export default function StorePage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={null}>
      <StorePageContent slug={params.slug} />
    </Suspense>
  );
}

function cartStorageKey(slug: string) {
  return `studiomaker_cart_${slug}`;
}

/** Chave de linha do carrinho — mesmo produto com personalizações diferentes vira linhas separadas. */
function lineKey(productId: string, customization?: string | null) {
  return `${productId}::${customization ?? ""}`;
}

function StorePageContent({ slug }: { slug: string }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const pedidoStatus = searchParams.get("pedido");
  const checkoutId = searchParams.get("checkout_id");

  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<StoreProfilePublic | null>(null);
  const [products, setProducts] = useState<StoreProductPublic[]>([]);
  const [banners, setBanners] = useState<StoreBannerPublic[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<StoreProductPublic | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [orderSummaryLoading, setOrderSummaryLoading] = useState(false);

  useEffect(() => {
    loadStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartStorageKey(slug));
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // ignora carrinho corrompido
    }
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey(slug), JSON.stringify(cart));
    } catch {
      // localStorage indisponível — carrinho só dura a sessão da aba
    }
  }, [cart, slug]);

  const showsOrderPanel = pedidoStatus === "sucesso" || pedidoStatus === "pix" || pedidoStatus === "acompanhar";

  useEffect(() => {
    if (!showsOrderPanel || !checkoutId) return;
    let active = true;
    const load = (first: boolean) => {
      if (first) setOrderSummaryLoading(true);
      fetch(`/api/store/${slug}/order?checkout_id=${checkoutId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => active && data && setOrderSummary(data))
        .finally(() => first && active && setOrderSummaryLoading(false));
    };
    load(true);
    // Enquanto o Pix não é conferido pela loja, atualiza sozinho pro cliente ver a confirmação.
    const timer = setInterval(() => load(false), 20000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [showsOrderPanel, checkoutId, slug]);

  async function loadStore() {
    setLoading(true);
    const { data: sellerData } = await supabase
      .from("store_profiles_public")
      .select("*")
      .eq("store_slug", slug)
      .maybeSingle();

    if (!sellerData) {
      setSeller(null);
      setLoading(false);
      return;
    }

    const typedSeller = sellerData as StoreProfilePublic;
    setSeller(typedSeller);

    const [{ data: productsData }, { data: bannersData }] = await Promise.all([
      supabase
        .from("store_products_public")
        .select("*")
        .eq("user_id", typedSeller.user_id)
        .order("store_display_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("store_banners_public")
        .select("*")
        .eq("user_id", typedSeller.user_id)
        .order("display_order", { ascending: true }),
    ]);

    setProducts((productsData as StoreProductPublic[]) ?? []);
    setBanners((bannersData as StoreBannerPublic[]) ?? []);
    setLoading(false);
  }

  function addToCart(product: StoreProductPublic, customization: string | null) {
    setCart((prev) => {
      const key = lineKey(product.id, customization);
      const existing = prev.find((l) => lineKey(l.productId, l.customization) === key);
      if (existing) {
        return prev.map((l) => (lineKey(l.productId, l.customization) === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice: product.sale_price, quantity: 1, customization }];
    });
  }

  function updateQuantity(line: CartLine, quantity: number) {
    const key = lineKey(line.productId, line.customization);
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((l) => lineKey(l.productId, l.customization) !== key)
        : prev.map((l) => (lineKey(l.productId, l.customization) === key ? { ...l, quantity } : l))
    );
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c))),
    [products]
  );
  const filteredProducts = useMemo(
    () => (categoryFilter ? products.filter((p) => p.category === categoryFilter) : products),
    [products, categoryFilter]
  );

  const cartTotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);

  function handleCheckoutSuccess() {
    setCart([]);
    setCartOpen(false);
    setStep("cart");
  }

  const primaryColor = seller?.primary_color || DEFAULT_STORE_PRIMARY_COLOR;
  const secondaryColor = seller?.secondary_color || DEFAULT_STORE_SECONDARY_COLOR;
  const titleColor = seller?.title_color || DEFAULT_STORE_TITLE_COLOR;
  const titleFontOption = getStoreFont(seller?.title_font);
  const subtitleFontOption = getStoreFont(seller?.subtitle_font);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0914] text-white/60">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (!seller || !seller.store_enabled || !seller.payment_ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0B0914] px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white/60">
          <Store size={24} />
        </div>
        <h1 className="text-xl text-white">Loja indisponível no momento</h1>
        <p className="max-w-sm text-sm text-white/60">Essa loja ainda não está aceitando pedidos. Volte mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: secondaryColor }}>
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
            {seller.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seller.logo_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <span style={{ fontFamily: titleFontOption.cssFamily, color: titleColor }} className="text-lg">
            {seller.studio_name || "Loja"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/5"
          aria-label="Ver carrinho"
        >
          <ShoppingCart size={18} />
          {cartCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </header>

      <CategoryNav categories={categories} activeCategory={categoryFilter} onSelect={setCategoryFilter} primaryColor={primaryColor} />

      <main className="mx-auto max-w-5xl px-6 pb-24 md:px-12">
        {banners.length > 0 && (
          <div className="mb-8">
            <BannerSlideshow banners={banners} subtitleFontFamily={subtitleFontOption.cssFamily} />
          </div>
        )}

        {showsOrderPanel && (
          <OrderTracking
            summary={orderSummary}
            loading={orderSummaryLoading}
            products={products}
            primaryColor={primaryColor}
            titleColor={titleColor}
            titleFontFamily={titleFontOption.cssFamily}
            subtitleFontFamily={subtitleFontOption.cssFamily}
            defaultProductionMessage={seller.default_production_message}
            whatsappNumber={seller.whatsapp_number}
          />
        )}
        {pedidoStatus === "pendente" && (
          <div className="mb-8 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Seu pagamento está sendo processado — assim que confirmado, o vendedor será avisado.
          </div>
        )}
        {pedidoStatus === "falha" && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Não foi possível concluir o pagamento. Tente novamente.
          </div>
        )}

        <div className="mb-8 text-center">
          <h1 style={{ fontFamily: titleFontOption.cssFamily, color: titleColor }} className="text-3xl md:text-4xl">
            {seller.studio_name || "Loja"}
          </h1>
          {seller.store_headline && (
            <p style={{ fontFamily: subtitleFontOption.cssFamily, color: titleColor }} className="mt-3 opacity-75">
              {seller.store_headline}
            </p>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.04] py-10 text-center text-sm text-white/60">
            Nenhum produto disponível na loja no momento.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p) => (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl bg-white/[0.04]">
                <button
                  type="button"
                  onClick={() => setViewingProduct(p)}
                  className="flex aspect-square items-center justify-center overflow-hidden bg-white/5"
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">🧩</span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <button type="button" onClick={() => setViewingProduct(p)} className="text-left">
                    <p className="line-clamp-2 text-sm font-medium text-white">{p.name}</p>
                  </button>
                  <p className="mt-auto text-base font-semibold" style={{ color: primaryColor }}>
                    {formatBRL(p.sale_price)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (p.allows_customization) {
                        setViewingProduct(p);
                        return;
                      }
                      addToCart(p, null);
                      setCartOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.01]"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus size={13} /> {p.allows_customization ? "Personalizar" : "Adicionar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-white/50 md:px-12">
        Loja por{" "}
        <a href="/" className="hover:text-white/70">
          StudioMaker3D
        </a>
      </footer>

      {seller.whatsapp_number && (
        <WhatsAppFloatingButton
          phone={seller.whatsapp_number}
          defaultMessage={seller.whatsapp_default_message}
          productName={viewingProduct?.name}
        />
      )}

      {viewingProduct && (
        <ProductModal
          product={viewingProduct}
          primaryColor={primaryColor}
          titleFontFamily={titleFontOption.cssFamily}
          subtitleFontFamily={subtitleFontOption.cssFamily}
          defaultProductionMessage={seller.default_production_message}
          onClose={() => setViewingProduct(null)}
          onAddToCart={(customization) => {
            addToCart(viewingProduct, customization);
            setViewingProduct(null);
            setCartOpen(true);
          }}
        />
      )}

      <Modal
        open={cartOpen}
        onClose={() => {
          setCartOpen(false);
          setStep("cart");
        }}
        title={step === "cart" ? "Seu carrinho" : "Finalizar compra"}
        maxWidthClass="max-w-md"
      >
        {step === "cart" ? (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">Seu carrinho está vazio.</p>
            ) : (
              <>
                <div className="space-y-2.5">
                  {cart.map((line) => (
                    <div
                      key={lineKey(line.productId, line.customization)}
                      className="flex items-center gap-3 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text-primary">{line.name}</p>
                        <p className="font-numeric text-xs text-text-muted">{formatBRL(line.unitPrice)} / un.</p>
                        {line.customization && (
                          <p className="mt-0.5 truncate text-[11px] text-neon-pink">&quot;{line.customization}&quot;</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => updateQuantity(line, line.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-text-secondary hover:text-text-primary"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="font-numeric w-5 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => updateQuantity(line, line.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-text-secondary hover:text-text-primary"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          onClick={() => updateQuantity(line, 0)}
                          className="text-text-muted hover:text-red-400"
                          aria-label="Remover do carrinho"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border-glass pt-4">
                  <span className="text-sm text-text-secondary">Total</span>
                  <span className="font-numeric text-xl font-semibold" style={{ color: primaryColor }}>
                    {formatBRL(cartTotal)}
                  </span>
                </div>
                <button
                  onClick={() => setStep("checkout")}
                  className="w-full rounded-full py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Finalizar Compra
                </button>
              </>
            )}
          </div>
        ) : (
          <CheckoutForm slug={slug} seller={seller} cart={cart} total={cartTotal} onBack={() => setStep("cart")} onSuccess={handleCheckoutSuccess} />
        )}
      </Modal>
    </div>
  );
}
