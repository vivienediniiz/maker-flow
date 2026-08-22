"use client";

import { useState } from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL } from "@/lib/utils";
import { formatCep, cepDigits, fetchAddressByCep } from "@/lib/viaCep";
import { Loader2, ArrowLeft } from "lucide-react";
import type { CartLine } from "./page";

interface CheckoutFormProps {
  slug: string;
  cart: CartLine[];
  total: number;
  onBack: () => void;
  onSuccess: () => void;
}

export function CheckoutForm({ slug, cart, total, onBack, onSuccess }: CheckoutFormProps) {
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
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
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
      window.location.href = data.init_point;
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

      <div className="glass-card flex items-center justify-between px-4 py-3">
        <span className="text-sm text-text-secondary">{cart.length} {cart.length === 1 ? "item" : "itens"}</span>
        <span className="font-numeric text-lg font-semibold text-neon-pink">{formatBRL(total)}</span>
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
            required
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            className="glass-input w-full"
            placeholder="00000-000"
          />
          {cepError && <p className="mt-1 text-[11px] text-amber-400">{cepError}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Número</label>
          <input required value={number} onChange={(e) => setNumber(e.target.value)} className="glass-input w-full" />
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-xs text-text-muted">Rua</label>
          <input required value={street} onChange={(e) => setStreet(e.target.value)} className="glass-input w-full" />
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
            <input required value={city} onChange={(e) => setCity(e.target.value)} className="glass-input w-full" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">UF</label>
            <input required value={state} onChange={(e) => setState(e.target.value)} maxLength={2} className="glass-input w-full" />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <NeonButton type="submit" className="w-full justify-center" disabled={submitting}>
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null} {submitting ? "Redirecionando..." : "Ir para o pagamento"}
      </NeonButton>
    </form>
  );
}
