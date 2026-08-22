"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Modal } from "@/components/ui/Modal";
import { formatBRL } from "@/lib/utils";
import { CheckoutForm } from "./CheckoutForm";
import { ShoppingCart, Plus, Minus, Trash2, Store, Loader2, CheckCircle2 } from "lucide-react";
import type { StoreProductPublic, StoreProfilePublic } from "@/lib/types";

export interface CartLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
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

function StorePageContent({ slug }: { slug: string }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const pedidoStatus = searchParams.get("pedido");

  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<StoreProfilePublic | null>(null);
  const [products, setProducts] = useState<StoreProductPublic[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");

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

    const { data: productsData } = await supabase
      .from("store_products_public")
      .select("*")
      .eq("user_id", typedSeller.user_id)
      .order("store_display_order", { ascending: true, nullsFirst: false });

    setProducts((productsData as StoreProductPublic[]) ?? []);
    setLoading(false);
  }

  function addToCart(product: StoreProductPublic) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice: product.sale_price, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0 ? prev.filter((l) => l.productId !== productId) : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l))
    );
  }

  const cartTotal = useMemo(() => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);

  function handleCheckoutSuccess() {
    setCart([]);
    setCartOpen(false);
    setStep("cart");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  if (!seller || !seller.store_enabled || !seller.payment_ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-text-muted">
          <Store size={24} />
        </div>
        <h1 className="font-display text-xl">Loja indisponível no momento</h1>
        <p className="max-w-sm text-sm text-text-secondary">
          Essa loja ainda não está aceitando pedidos. Volte mais tarde.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neon-gradient">
            {seller.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seller.avatar_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <span className="font-display text-lg">{seller.studio_name || "Loja"}</span>
        </div>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border-glassStrong text-text-primary hover:bg-white/5"
          aria-label="Ver carrinho"
        >
          <ShoppingCart size={18} />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-neon-gradient px-1 text-[10px] font-semibold text-white">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 md:px-12">
        {pedidoStatus === "sucesso" && (
          <div className="mb-8 flex items-center gap-2.5 rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-3 text-sm text-neon-green">
            <CheckCircle2 size={16} /> Pedido recebido — obrigado pela compra!
          </div>
        )}
        {pedidoStatus === "pendente" && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Seu pagamento está sendo processado — assim que confirmado, o vendedor será avisado.
          </div>
        )}
        {pedidoStatus === "falha" && (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Não foi possível concluir o pagamento. Tente novamente.
          </div>
        )}

        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl md:text-4xl">{seller.studio_name || "Loja"}</h1>
          {seller.store_headline && <p className="mt-3 text-text-secondary">{seller.store_headline}</p>}
        </div>

        {products.length === 0 ? (
          <GlassCard padding="lg" className="text-center text-sm text-text-muted">
            Nenhum produto disponível na loja no momento.
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <GlassCard key={p.id} hover padding="none" className="flex flex-col overflow-hidden">
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-neon-gradient-soft">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">🧩</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="line-clamp-2 text-sm font-medium text-text-primary">{p.name}</p>
                  <p className="font-numeric mt-auto text-base font-semibold text-neon-pink">{formatBRL(p.sale_price)}</p>
                  <NeonButton size="sm" className="w-full justify-center" onClick={() => addToCart(p)}>
                    <Plus size={13} /> Adicionar
                  </NeonButton>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border-glass px-6 py-6 text-center text-xs text-text-muted md:px-12">
        Loja por{" "}
        <a href="/" className="hover:text-text-secondary">
          StudioMaker3D
        </a>
      </footer>

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
                    <div key={line.productId} className="flex items-center gap-3 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text-primary">{line.name}</p>
                        <p className="font-numeric text-xs text-text-muted">{formatBRL(line.unitPrice)} / un.</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => updateQuantity(line.productId, line.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-text-secondary hover:text-text-primary"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="font-numeric w-5 text-center text-sm">{line.quantity}</span>
                        <button
                          onClick={() => updateQuantity(line.productId, line.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-text-secondary hover:text-text-primary"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          onClick={() => updateQuantity(line.productId, 0)}
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
                  <span className="neon-text font-numeric text-xl font-semibold">{formatBRL(cartTotal)}</span>
                </div>
                <NeonButton className="w-full justify-center" onClick={() => setStep("checkout")}>
                  Finalizar Compra
                </NeonButton>
              </>
            )}
          </div>
        ) : (
          <CheckoutForm
            slug={slug}
            cart={cart}
            total={cartTotal}
            onBack={() => setStep("cart")}
            onSuccess={handleCheckoutSuccess}
          />
        )}
      </Modal>
    </div>
  );
}
