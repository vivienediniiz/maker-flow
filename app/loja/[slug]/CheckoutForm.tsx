"use client";

import { useMemo, useState } from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL, cn } from "@/lib/utils";
import { formatCep, cepDigits, fetchAddressByCep } from "@/lib/viaCep";
import { computeCheckoutTotals, listDeliveryChoices, parseShippingOptions } from "@/lib/storeCheckout";
import { Loader2, ArrowLeft } from "lucide-react";
import type { StoreProfilePublic } from "@/lib/types";
import type { CartLine } from "./page";

interface CheckoutFormProps {
  slug: string;
  seller: StoreProfilePublic;
  cart: CartLine[];
  total: number;
  onBack: () => void;
  onSuccess: () => void;
}

type PaymentMethod = "mercado_pago" | "infinitepay" | "pix_direto";

const INFINITEPAY_AVAILABLE = process.env.NEXT_PUBLIC_INFINITEPAY_STORE_SLUG;

export function CheckoutForm({ slug, seller, cart, total, onBack, onSuccess }: CheckoutFormProps) {
  const paymentOptions = useMemo(() => {
    const options: { value: PaymentMethod; label: string; hint?: string }[] = [];
    if (seller.pix_ready) {
      const discount = Number(seller.pix_discount_percent) || 0;
      options.push({ value: "pix_direto", label: "Pix", hint: discount > 0 ? `${discount}% de desconto` : undefined });
    }
    if (seller.mp_ready) options.push({ value: "mercado_pago", label: "Cartão / Mercado Pago" });
    if (INFINITEPAY_AVAILABLE && slug === INFINITEPAY_AVAILABLE) options.push({ value: "infinitepay", label: "InfinitePay" });
    if (options.length === 0) options.push({ value: "mercado_pago", label: "Mercado Pago" });
    return options;
  }, [seller, slug]);
  const showPaymentChoice = paymentOptions.length > 1;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentOptions[0].value);

  const deliveryChoices = useMemo(
    () =>
      listDeliveryChoices({
        pickup_enabled: !!seller.pickup_enabled,
        pickup_address: seller.pickup_address ?? null,
        arrange_enabled: !!seller.arrange_enabled,
        arrange_note: seller.arrange_note ?? null,
        shipping_options: parseShippingOptions(seller.shipping_options),
      }),
    [seller]
  );
  const [deliveryIndex, setDeliveryIndex] = useState(0);
  const selectedDelivery = deliveryChoices[deliveryIndex] ?? null;
  // Sem opções de entrega configuradas (loja antiga) o endereço continua obrigatório, como antes.
  const needsAddress = deliveryChoices.length === 0 || selectedDelivery?.choice.type === "shipping";

  const totals = computeCheckoutTotals({
    subtotal: total,
    pixDiscountPercent: Number(seller.pix_discount_percent) || 0,
    isPixDirect: paymentMethod === "pix_direto",
    shippingAmount: selectedDelivery?.amount ?? 0,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCepChange(raw: string) {
    const formatted = formatCep(raw);
    setCep(formatted);
    setCepError(null);
    if (cepDigits(formatted).length !== 8) return;
    setCepLoading(true);
    try {
      const address = await fetchAddressByCep(formatted);
      if (!address) {
        setCepError("CEP não encontrado");
      } else {
        setStreet(address.street);
        setNeighborhood(address.neighborhood);
        setCity(address.city);
        setState(address.state);
      }
    } catch {
      setCepError("Falha ao consultar o CEP — tente de novo.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/store/${slug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, customization: l.customization || undefined })),
          paymentMethod,
          delivery: selectedDelivery?.choice,
          buyer: {
            name,
            email,
            phone: phone || undefined,
            cep: cep || undefined,
            street: street || undefined,
            number: number || undefined,
            complement: complement || undefined,
            neighborhood: neighborhood || undefined,
            city: city || undefined,
            state: state || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o pagamento.");
        setSubmitting(false);
        return;
      }

      onSuccess();
      window.location.href = data.pix ? `/loja/${slug}?pedido=pix&checkout_id=${data.checkout_id}` : data.init_point;
    } catch {
      setError("Erro de rede — tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
      >
        <ArrowLeft size={13} /> Voltar pro carrinho
      </button>

      <div className="glass-card space-y-1.5 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">{cart.length} {cart.length === 1 ? "item" : "itens"}</span>
          <span className="font-numeric text-sm text-text-secondary">{formatBRL(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="flex items-center justify-between text-xs text-neon-green">
            <span>Desconto no Pix</span>
            <span className="font-numeric">- {formatBRL(totals.discount)}</span>
          </div>
        )}
        {selectedDelivery && (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{selectedDelivery.label}</span>
            <span className="font-numeric">{totals.shipping > 0 ? formatBRL(totals.shipping) : "Grátis"}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border-glass pt-1.5">
          <span className="text-sm text-text-secondary">Total</span>
          <span className="font-numeric text-lg font-semibold text-neon-pink">{formatBRL(totals.total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1.5 block text-xs text-text-muted">Nome completo</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="glass-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">WhatsApp</label>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="glass-input w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs text-text-muted">
            CEP {cepLoading && <Loader2 size={11} className="animate-spin" />}
          </label>
          <input
            required={needsAddress}
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            className="glass-input w-full"
            placeholder="00000-000"
          />
          {cepError && <p className="mt-1 text-[11px] text-amber-400">{cepError}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Número</label>
          <input required={needsAddress} value={number}onChange={(e) => setNumber(e.target.value)} className="glass-input w-full" />
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-xs text-text-muted">Rua</label>
          <input required={needsAddress} value={street}onChange={(e) => setStreet(e.target.value)} className="glass-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Bairro</label>
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="glass-input w-full" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Complemento</label>
          <input value={complement} onChange={(e) => setComplement(e.target.value)} className="glass-input w-full" />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Cidade</label>
            <input required={needsAddress} value={city}onChange={(e) => setCity(e.target.value)} className="glass-input w-full" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">UF</label>
            <input required={needsAddress} value={state}onChange={(e) => setState(e.target.value)} maxLength={2} className="glass-input w-full" />
          </div>
        </div>
      </div>

      {deliveryChoices.length > 0 && (
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Entrega</label>
          <div className="space-y-2">
            {deliveryChoices.map((d, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setDeliveryIndex(index)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                  deliveryIndex === index
                    ? "border-neon-pink/50 bg-neon-pink/10"
                    : "border-border-glass bg-white/[0.02] hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-primary">{d.label}</span>
                  <span className="font-numeric text-xs text-text-secondary">{d.amount > 0 ? formatBRL(d.amount) : "Grátis"}</span>
                </div>
                {d.note && <p className="mt-0.5 text-[11px] text-text-muted">{d.note}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {showPaymentChoice && (
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Forma de pagamento</label>
          <div className="glass-card flex gap-1 p-1">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMethod(opt.value)}
                className={cn(
                  "flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium transition-colors sm:min-h-0",
                  paymentMethod === opt.value ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {opt.label}
                {opt.hint && <span className="ml-1 text-[10px] opacity-80">({opt.hint})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <NeonButton type="submit" className="w-full justify-center" disabled={submitting}>
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null} {submitting ? "Aguarde..." : paymentMethod === "pix_direto" ? "Gerar Pix" : "Ir para o pagamento"}
      </NeonButton>
    </form>
  );
}
