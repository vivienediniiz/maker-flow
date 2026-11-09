"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import { normalizePixKey } from "@/lib/pixBrCode";
import { parseShippingOptions, type ShippingOption } from "@/lib/storeCheckout";
import type { StoreSettings } from "@/lib/types";

/**
 * Pagamento por Pix direto (cai na conta do lojista, sem taxa nem
 * intermediário) e opções de entrega que o cliente escolhe no checkout da loja.
 */
export function StorePaymentDeliveryCard({ userId, studioName }: { userId: string; studioName: string }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pixKey, setPixKey] = useState("");
  const [pixHolder, setPixHolder] = useState("");
  const [pixCity, setPixCity] = useState("");
  const [pixDiscount, setPixDiscount] = useState(0);
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [arrangeEnabled, setArrangeEnabled] = useState(false);
  const [arrangeNote, setArrangeNote] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("store_settings").select("*").eq("user_id", userId).maybeSingle();
      const settings = data as StoreSettings | null;
      if (settings) {
        setPixKey(settings.pix_key ?? "");
        setPixHolder(settings.pix_holder_name ?? "");
        setPixCity(settings.pix_city ?? "");
        setPixDiscount(Number(settings.pix_discount_percent) || 0);
        setPickupEnabled(!!settings.pickup_enabled);
        setPickupAddress(settings.pickup_address ?? "");
        setArrangeEnabled(!!settings.arrange_enabled);
        setArrangeNote(settings.arrange_note ?? "");
        setShippingOptions(parseShippingOptions(settings.shipping_options));
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function addShippingOption() {
    if (shippingOptions.length >= 6) return;
    setShippingOptions((prev) => [...prev, { id: crypto.randomUUID(), label: "", price: 0, note: "" }]);
  }

  function updateOption(id: string, patch: Partial<ShippingOption>) {
    setShippingOptions((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  async function handleSave() {
    setError(null);
    setSaved(false);

    let normalizedKey: string | null = null;
    if (pixKey.trim()) {
      normalizedKey = normalizePixKey(pixKey);
      if (!normalizedKey) {
        setError("Chave Pix inválida. Use CPF, CNPJ, e-mail, telefone com +55 (ex.: +5582999990000) ou chave aleatória.");
        return;
      }
      if (!pixHolder.trim() || !pixCity.trim()) {
        setError("Informe o nome de quem recebe e a cidade do recebedor — o banco exige os dois no QR Code do Pix.");
        return;
      }
    }
    if (pickupEnabled && !pickupAddress.trim()) {
      setError("Informe o endereço de retirada.");
      return;
    }
    const cleanOptions = shippingOptions.filter((o) => o.label.trim());

    setSaving(true);
    const { error: saveError } = await supabase.from("store_settings").upsert({
      user_id: userId,
      pix_key: normalizedKey,
      pix_holder_name: pixHolder.trim() || null,
      pix_city: pixCity.trim() || null,
      pix_discount_percent: Math.min(Math.max(pixDiscount, 0), 50),
      pickup_enabled: pickupEnabled,
      pickup_address: pickupAddress.trim() || null,
      arrange_enabled: arrangeEnabled,
      arrange_note: arrangeNote.trim() || null,
      shipping_options: parseShippingOptions(cleanOptions),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    if (normalizedKey) setPixKey(normalizedKey);
    setShippingOptions(parseShippingOptions(cleanOptions));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <GlassCard padding="lg" className="flex justify-center py-10 text-text-muted">
        <Loader2 size={20} className="animate-spin" />
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="lg" className="space-y-6">
      <div>
        <h3 className="font-display text-lg">Pagamento por Pix e Entrega</h3>
        <p className="text-sm text-text-secondary">
          O Pix cai direto na sua conta, sem taxa e sem passar pelo StudioMaker. A entrega que você configurar aparece
          pro cliente escolher no carrinho.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted/80">Pix na minha chave</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs text-text-muted">Chave Pix</label>
            <input
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              className="glass-input w-full"
              placeholder="CPF, CNPJ, e-mail, +5582999990000 ou chave aleatória"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Nome de quem recebe</label>
            <input
              value={pixHolder}
              onChange={(e) => setPixHolder(e.target.value)}
              maxLength={25}
              className="glass-input w-full"
              placeholder={studioName || "Nome no banco"}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Cidade do recebedor</label>
            <input
              value={pixCity}
              onChange={(e) => setPixCity(e.target.value)}
              maxLength={15}
              className="glass-input w-full"
              placeholder="Ex.: Maceió"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Desconto pra quem pagar no Pix (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              value={pixDiscount || ""}
              onChange={(e) => setPixDiscount(Math.min(Math.max(Number(e.target.value), 0), 50))}
              className="glass-input w-full"
              placeholder="0"
            />
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-text-muted">
          Deixe a chave em branco pra não oferecer Pix direto. O pedido entra em Vendas como &quot;Aguardando
          Pagamento&quot;; quando o dinheiro cair, abra a venda e use <strong>Marcar como Pago</strong>. O desconto vale
          só nos produtos (não no frete) e só no Pix direto.
        </p>
      </div>

      <div className="space-y-4 border-t border-border-glass pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted/80">Entrega</p>

        <div className="space-y-2">
          <Toggle checked={pickupEnabled} onChange={setPickupEnabled} label="Retirar no ateliê (grátis)" />
          {pickupEnabled && (
            <input
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="glass-input w-full"
              placeholder="Endereço de retirada (aparece pro cliente no carrinho e no acompanhamento)"
            />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-text-muted">Opções com valor (Correios, motoboy...)</p>
          {shippingOptions.map((option) => (
            <div key={option.id} className="grid grid-cols-1 gap-2 rounded-xl border border-border-glass p-3 sm:grid-cols-[1fr_140px_1fr_auto]">
              <input
                value={option.label}
                onChange={(e) => updateOption(option.id, { label: e.target.value })}
                maxLength={60}
                className="glass-input w-full"
                placeholder="Nome (ex.: Correios PAC)"
              />
              <CurrencyInput
                value={option.price ? String(option.price) : ""}
                onChange={(v) => updateOption(option.id, { price: v === "" ? 0 : Math.max(Number(v), 0) })}
                placeholder="Valor"
              />
              <input
                value={option.note ?? ""}
                onChange={(e) => updateOption(option.id, { note: e.target.value })}
                maxLength={200}
                className="glass-input w-full"
                placeholder="Observação (ex.: 5 a 8 dias úteis)"
              />
              <button
                type="button"
                onClick={() => setShippingOptions((prev) => prev.filter((o) => o.id !== option.id))}
                className="flex items-center justify-center text-text-muted hover:text-red-400"
                aria-label="Remover opção de entrega"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {shippingOptions.length < 6 && (
            <NeonButton type="button" variant="outline" size="sm" onClick={addShippingOption}>
              <Plus size={14} /> Adicionar opção
            </NeonButton>
          )}
        </div>

        <div className="space-y-2">
          <Toggle checked={arrangeEnabled} onChange={setArrangeEnabled} label="Entrega a combinar com a loja" />
          {arrangeEnabled && (
            <input
              value={arrangeNote}
              onChange={(e) => setArrangeNote(e.target.value)}
              className="glass-input w-full"
              placeholder="Orientação pro cliente (ex.: entregamos na cidade, combinamos pelo WhatsApp)"
            />
          )}
        </div>

        <p className="text-[11px] text-text-muted">
          Se você não configurar nenhuma opção, o carrinho segue sem etapa de entrega, como antes.
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <NeonButton type="button" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : null} {saved ? "Salvo!" : "Salvar pagamento e entrega"}
      </NeonButton>
    </GlassCard>
  );
}
