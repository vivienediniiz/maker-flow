"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Calculator } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { CategorySelect } from "@/components/dashboard/CategorySelect";
import { PriceTierEditor } from "@/components/dashboard/PriceTierEditor";
import { CostCalculatorModal } from "@/components/dashboard/CostCalculatorModal";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import type { Product, PriceTier, CalcInputs } from "@/lib/types";

interface NewProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
  /** Quando presente, o modal edita esse produto em vez de criar um novo. */
  product?: Product | null;
  initialName?: string;
  initialDescription?: string;
  initialCostPrice?: number;
  initialSalePrice?: number;
  calcInputs?: CalcInputs;
  /** Pra empilhar por cima de outro modal já aberto (ex: Nova Venda Manual). */
  zIndexClass?: string;
  maxWidthClass?: string;
}

export function NewProductModal({
  open,
  onClose,
  onCreated,
  product = null,
  initialName = "",
  initialDescription = "",
  initialCostPrice,
  initialSalePrice,
  calcInputs,
  zIndexClass,
  maxWidthClass,
}: NewProductModalProps) {
  const supabase = createClient();
  const isEditing = !!product;
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState(initialDescription);
  const [costPrice, setCostPrice] = useState(initialCostPrice != null ? String(initialCostPrice.toFixed(2)) : "");
  const [salePrice, setSalePrice] = useState(initialSalePrice != null ? String(initialSalePrice.toFixed(2)) : "");
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [estimatedProductionDays, setEstimatedProductionDays] = useState("");
  const [allowsCustomization, setAllowsCustomization] = useState(false);
  const [customizationLabel, setCustomizationLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  // Mesas/filamento/margem recém-calculados aqui dentro via "Calcular Custo
  // Unitário" — quando presentes, têm prioridade sobre o `calcInputs` vindo
  // por prop (que reflete um cálculo anterior, feito antes de abrir este
  // modal, ex: pela Calculadora Inteligente).
  const [calculatedInputs, setCalculatedInputs] = useState<CalcInputs | null>(null);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setCostPrice(String(product.cost_price.toFixed(2)));
      setSalePrice(String(product.sale_price.toFixed(2)));
      setCategory(product.category ?? "");
      setPriceTiers(product.price_tiers ?? []);
      setImageUrl(product.image_url ?? null);
      setEstimatedProductionDays(product.estimated_production_days != null ? String(product.estimated_production_days) : "");
      setAllowsCustomization(product.allows_customization ?? false);
      setCustomizationLabel(product.customization_label ?? "");
    } else {
      setName(initialName);
      setDescription(initialDescription);
      setCostPrice(initialCostPrice != null ? String(initialCostPrice.toFixed(2)) : "");
      setSalePrice(initialSalePrice != null ? String(initialSalePrice.toFixed(2)) : "");
      setCategory("");
      setPriceTiers([]);
      setImageUrl(null);
      setEstimatedProductionDays("");
      setAllowsCustomization(false);
      setCustomizationLabel("");
    }
    setCalculatedInputs(null);
    setError(null);
  }, [open, product, initialName, initialDescription, initialCostPrice, initialSalePrice]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploadingImage(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("products").upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploadingImage(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const payload = {
      name,
      category: category || null,
      description: description || null,
      image_url: imageUrl,
      cost_price: Number(costPrice) || 0,
      sale_price: Number(salePrice) || 0,
      price_tiers: priceTiers.filter((t) => t.quantity > 0 && t.price > 0),
      estimated_production_days: estimatedProductionDays ? Number(estimatedProductionDays) : null,
      allows_customization: allowsCustomization,
      customization_label: allowsCustomization ? customizationLabel.trim() || null : null,
    };

    const { data, error: dbError } = isEditing
      ? await supabase
          .from("products")
          // Só sobrescreve calc_inputs se algo foi recalculado nesta sessão —
          // editar outros campos do produto não deve apagar o cálculo já salvo.
          .update({ ...payload, ...(calculatedInputs ? { calc_inputs: calculatedInputs } : {}) })
          .eq("id", product!.id)
          .select()
          .single()
      : await supabase
          .from("products")
          .insert({ ...payload, user_id: user.id, stock_quantity: 0, calc_inputs: calculatedInputs ?? calcInputs ?? null })
          .select()
          .single();

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onCreated(data as Product);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Produto" : "Cadastrar Produto"}
      zIndexClass={zIndexClass}
      maxWidthClass={maxWidthClass}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto scrollbar-glass pr-1">
        {/* Foto do produto */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-28 w-28 overflow-hidden rounded-xl border border-border-glass bg-white/[0.03]">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                <Camera size={22} />
              </div>
            )}
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 text-transparent transition-colors hover:bg-black/40 hover:text-white">
              {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
          <p className="text-[11px] text-text-muted">Clique na imagem pra adicionar uma foto</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome do produto</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Vaso Geométrico Torcido"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Categoria</label>
          <CategorySelect value={category} onChange={setCategory} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="glass-input w-full resize-none"
            placeholder="Detalhes do produto, material, acabamento..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Custo (R$)</label>
            <div className="relative">
              <CurrencyInput value={costPrice} onChange={setCostPrice} required className="pr-9" />
              <button
                type="button"
                onClick={() => setCalculatorOpen(true)}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-neon-pink"
                aria-label="Calcular custo unitário"
                title="Calcular custo unitário"
              >
                <Calculator size={14} />
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Venda (R$)</label>
            <CurrencyInput value={salePrice} onChange={setSalePrice} required />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Faixas de preço por quantidade <span className="text-text-muted/60">(opcional)</span>
          </label>
          <PriceTierEditor tiers={priceTiers} onChange={setPriceTiers} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Prazo de produção (dias úteis) <span className="text-text-muted/60">(opcional)</span>
          </label>
          <input
            type="number"
            min={0}
            value={estimatedProductionDays}
            onChange={(e) => setEstimatedProductionDays(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: 5"
          />
          <p className="mt-1 text-[11px] text-text-muted">Exibido na loja como &quot;Pronto em até X dias úteis&quot;.</p>
        </div>

        <div className="rounded-xl border border-border-glass bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-text-primary">Permite personalização</p>
              <p className="text-[11px] text-text-muted">Mostra um campo de texto livre na loja antes da compra.</p>
            </div>
            <Toggle checked={allowsCustomization} onChange={setAllowsCustomization} />
          </div>
          {allowsCustomization && (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs text-text-muted">Rótulo do campo</label>
              <input
                value={customizationLabel}
                onChange={(e) => setCustomizationLabel(e.target.value)}
                className="glass-input w-full"
                placeholder="Ex: Texto para gravação"
              />
            </div>
          )}
        </div>

        {(calculatedInputs ?? calcInputs) && (
          <p className="text-[11px] text-neon-green">
            ✓ Os parâmetros da calculadora serão salvos junto — ao selecionar este produto na
            Calculadora depois, tudo volta preenchido.
          </p>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Produto"}
          </NeonButton>
        </div>
      </form>

      <CostCalculatorModal
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onApply={(cost, sale, ci) => {
          setCostPrice(cost.toFixed(2));
          setSalePrice(sale.toFixed(2));
          setCalculatedInputs(ci);
        }}
      />
    </Modal>
  );
}