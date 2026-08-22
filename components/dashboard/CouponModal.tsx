"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import type { Coupon, CouponDiscountType } from "@/lib/types";

interface CouponModalProps {
  open: boolean;
  onClose: () => void;
  coupon?: Coupon | null;
  onSaved: (coupon: Coupon) => void;
}

export function CouponModal({ open, onClose, coupon, onSaved }: CouponModalProps) {
  const supabase = createClient();
  const isEditing = !!coupon;

  const [code, setCode] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(coupon?.code ?? "");
    setCampaignName(coupon?.campaign_name ?? "");
    setDiscountType(coupon?.discount_type ?? "percentage");
    setDiscountValue(coupon ? String(coupon.discount_value) : "");
    setMinOrderValue(coupon?.min_order_value != null ? String(coupon.min_order_value) : "");
    setUsageLimit(coupon?.usage_limit != null ? String(coupon.usage_limit) : "");
    setValidUntil(coupon?.valid_until ?? "");
    setActive(coupon?.active ?? true);
    setError(null);
  }, [open, coupon]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Informe o código do cupom.");
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      setError("Informe um valor de desconto válido.");
      return;
    }
    if (discountType === "percentage" && Number(discountValue) > 100) {
      setError("Desconto percentual não pode passar de 100%.");
      return;
    }

    setSaving(true);

    const payload = {
      code: code.trim().toUpperCase(),
      campaign_name: campaignName || null,
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_order_value: minOrderValue ? Number(minOrderValue) : null,
      usage_limit: usageLimit ? Number(usageLimit) : null,
      valid_until: validUntil || null,
      active,
    };

    if (isEditing && coupon) {
      const { data, error: updateError } = await supabase
        .from("coupons")
        .update(payload)
        .eq("id", coupon.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message.includes("coupons_user_code_unique") ? "Você já tem um cupom com esse código." : updateError.message);
        return;
      }
      onSaved(data as Coupon);
      onClose();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("coupons")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message.includes("coupons_user_code_unique") ? "Você já tem um cupom com esse código." : insertError.message);
      return;
    }

    onSaved(data as Coupon);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Cupom" : "Novo Cupom"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Código</label>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="glass-input w-full uppercase"
            placeholder="Ex: BLACKFRIDAY10"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Campanha (opcional)</label>
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Black Friday 2026"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Tipo de desconto</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
              className="glass-input w-full"
            >
              <option value="percentage" className="bg-bg-raised">Percentual</option>
              <option value="fixed" className="bg-bg-raised">Fixo (R$)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">
              Valor {discountType === "percentage" ? "(%)" : "(R$)"}
            </label>
            {discountType === "fixed" ? (
              <CurrencyInput value={discountValue} onChange={setDiscountValue} placeholder="0,00" />
            ) : (
              <input
                type="number"
                step="0.01"
                min="0"
                max={100}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="glass-input w-full"
                placeholder="0,00"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Pedido mínimo (opcional)</label>
            <CurrencyInput value={minOrderValue} onChange={setMinOrderValue} placeholder="0,00" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Limite de uso (opcional)</label>
            <input
              type="number"
              step="1"
              min="1"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              className="glass-input w-full"
              placeholder="Ilimitado"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Válido até (opcional)</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="glass-input w-full"
          />
        </div>

        <Toggle checked={active} onChange={setActive} label="Ativo" />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar Cupom"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
