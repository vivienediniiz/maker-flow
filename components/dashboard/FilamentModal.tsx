"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { FILAMENT_MATERIAL_OPTIONS, FILAMENT_BRAND_SUGGESTIONS } from "@/lib/filaments";
import type { Filament } from "@/lib/types";

const MATERIAL_OPTION_SET: readonly string[] = FILAMENT_MATERIAL_OPTIONS;
const BRAND_OPTION_SET: readonly string[] = FILAMENT_BRAND_SUGGESTIONS;

interface FilamentModalProps {
  open: boolean;
  onClose: () => void;
  filament?: Filament | null;
  onSaved: (filament: Filament) => void;
}

export function FilamentModal({ open, onClose, filament, onSaved }: FilamentModalProps) {
  const supabase = createClient();
  const isEditing = !!filament;

  const [brandOption, setBrandOption] = useState<string>(FILAMENT_BRAND_SUGGESTIONS[0]);
  const [customBrand, setCustomBrand] = useState("");
  const [materialOption, setMaterialOption] = useState<string>(FILAMENT_MATERIAL_OPTIONS[0]);
  const [customMaterial, setCustomMaterial] = useState("");
  const [colorHex, setColorHex] = useState("#FFFFFF");
  const [pricePerKg, setPricePerKg] = useState("");
  const [weightTotalG, setWeightTotalG] = useState("1000");
  const [remainingWeightG, setRemainingWeightG] = useState("1000");
  const [lowStockThresholdG, setLowStockThresholdG] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const currentBrand = filament?.brand ?? "";
    if (currentBrand && BRAND_OPTION_SET.includes(currentBrand)) {
      setBrandOption(currentBrand);
      setCustomBrand("");
    } else if (currentBrand) {
      setBrandOption("Outro");
      setCustomBrand(currentBrand);
    } else {
      setBrandOption(FILAMENT_BRAND_SUGGESTIONS[0]);
      setCustomBrand("");
    }
    const currentMaterial = filament?.material ?? "";
    if (currentMaterial && MATERIAL_OPTION_SET.includes(currentMaterial)) {
      setMaterialOption(currentMaterial);
      setCustomMaterial("");
    } else if (currentMaterial) {
      setMaterialOption("Outro");
      setCustomMaterial(currentMaterial);
    } else {
      setMaterialOption(FILAMENT_MATERIAL_OPTIONS[0]);
      setCustomMaterial("");
    }
    setColorHex(filament?.color_hex ?? "#FFFFFF");
    setPricePerKg(filament ? String(filament.price_per_kg) : "");
    setWeightTotalG(filament ? String(filament.weight_total_g) : "1000");
    setRemainingWeightG(filament ? String(filament.remaining_weight_g) : "1000");
    setLowStockThresholdG(filament?.low_stock_threshold_g != null ? String(filament.low_stock_threshold_g) : "");
    setError(null);
  }, [open, filament]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const brand = brandOption === "Outro" ? customBrand.trim() : brandOption;
    if (!brand) {
      setError("Informe a marca.");
      return;
    }

    const material = materialOption === "Outro" ? customMaterial.trim() : materialOption;
    if (!material) {
      setError("Informe o tipo de material.");
      return;
    }

    setSaving(true);

    const payload = {
      brand,
      material,
      color_hex: colorHex,
      price_per_kg: Number(pricePerKg) || 0,
      weight_total_g: Number(weightTotalG) || 0,
      remaining_weight_g: Number(remainingWeightG) || 0,
      low_stock_threshold_g: lowStockThresholdG === "" ? null : Number(lowStockThresholdG),
    };

    if (isEditing && filament) {
      const { data, error: updateError } = await supabase
        .from("filaments")
        .update(payload)
        .eq("id", filament.id)
        .select()
        .single();

      setSaving(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onSaved(data as Filament);
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

    // Cada linha e uma combinacao unica de marca+material+cor — se ja existe,
    // orienta a usar "Registrar Compra" em vez de duplicar a linha.
    const { data: existing } = await supabase
      .from("filaments")
      .select("id")
      .eq("user_id", user.id)
      .ilike("brand", brand.trim())
      .ilike("material", material.trim())
      .ilike("color_hex", colorHex.trim())
      .maybeSingle();

    if (existing) {
      setSaving(false);
      setError("Já existe um filamento com essa marca, material e cor. Use \"Registrar Compra\" pra abastecer o estoque dele.");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("filaments")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    onSaved(data as Filament);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Filamento" : "Novo Filamento"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Marca</label>
            <select
              value={brandOption}
              onChange={(e) => setBrandOption(e.target.value)}
              className="glass-input w-full"
            >
              {FILAMENT_BRAND_SUGGESTIONS.map((b) => (
                <option key={b} value={b} className="bg-bg-raised">
                  {b}
                </option>
              ))}
              <option value="Outro" className="bg-bg-raised">
                Outro
              </option>
            </select>
            {brandOption === "Outro" && (
              <input
                required
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                className="glass-input mt-2 w-full"
                placeholder="Digite a marca"
              />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Material</label>
            <select
              value={materialOption}
              onChange={(e) => setMaterialOption(e.target.value)}
              className="glass-input w-full"
            >
              {FILAMENT_MATERIAL_OPTIONS.map((m) => (
                <option key={m} value={m} className="bg-bg-raised">
                  {m}
                </option>
              ))}
            </select>
            {materialOption === "Outro" && (
              <input
                required
                value={customMaterial}
                onChange={(e) => setCustomMaterial(e.target.value)}
                className="glass-input mt-2 w-full"
                placeholder="Digite o material"
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Cor</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-border-glass bg-transparent"
            />
            <input
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="glass-input w-full"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Preço por kg (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            className="glass-input w-full"
            placeholder="89.00"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Peso total do rolo (g)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={weightTotalG}
              onChange={(e) => setWeightTotalG(e.target.value)}
              className="glass-input w-full"
              placeholder="1000"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Peso restante (g)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={remainingWeightG}
              onChange={(e) => setRemainingWeightG(e.target.value)}
              className="glass-input w-full"
              placeholder="1000"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Limite de estoque baixo (g) <span className="text-text-muted/60">— opcional</span>
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={lowStockThresholdG}
            onChange={(e) => setLowStockThresholdG(e.target.value)}
            className="glass-input w-full"
            placeholder="Padrão: 150g ou 15% do rolo"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar Filamento"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
