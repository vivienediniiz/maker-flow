"use client";

import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { MarginSlider } from "@/components/ui/MarginSlider";
import { NewSaleModal } from "@/components/dashboard/NewSaleModal";
import { NewProductModal } from "@/components/dashboard/NewProductModal";
import { GenerateQuoteModal } from "@/components/dashboard/GenerateQuoteModal";
import { FilamentModal } from "@/components/dashboard/FilamentModal";
import { FilamentPickerDropdown } from "@/components/dashboard/FilamentPickerDropdown";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { ConfigNudgeBanner } from "@/components/dashboard/ConfigNudgeBanner";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { calculateCost, type CalcMixedItem } from "@/lib/costCalculator";
import { Plus, Trash2, FileDown, Link2, Rocket, Info, Weight, Timer, Zap, TrendingUp, PackagePlus } from "lucide-react";
import type { Product, Supply, Filament, PrinterAsset, RiskTier, CalcInputs } from "@/lib/types";

type BedModelType = "A" | "B" | "C";

const BED_MODEL_OPTIONS: { value: BedModelType; label: string }[] = [
  { value: "B", label: "Peça única / Montagem" },
  { value: "A", label: "Lote (peças idênticas)" },
  { value: "C", label: "Mix (peças diferentes)" },
];

interface PrintBed {
  id: string;
  name: string;
  /** Peso/tempo TOTAIS da mesa cheia, direto do fatiador — a soma de todas as mesas é o custo de 1 unidade completa do produto (mesas Modelo A/B). */
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
  filamentId: string;
  /**
   * "A" = lote de peças idênticas nesta mesa (divide o custo por `piecesInBed`);
   * "B" = peça única/montagem, mesa inteira conta como 1 contribuição (padrão);
   * "C" = mix de peças diferentes, custo rateado por peso entre `mixedItems`, fora do custo do produto principal.
   */
  modelType: BedModelType;
  /** Divisor real do custo desta mesa quando `modelType === "A"`. */
  piecesInBed: number;
  /** Só usado quando `modelType === "C"`. */
  mixedItems: CalcMixedItem[];
  /** Opcional — só usada pra preencher `watts` automaticamente; não é salva no calc_inputs do produto. */
  printerAssetId: string;
  /** % aplicado só no cálculo de custo (filamento/energia) — peso/tempo digitados não mudam. */
  safetyMarginPercent: number;
}

interface SupplyLine {
  id: string;
  supplyId: string;
  quantity: number;
}

function newBed(index: number): PrintBed {
  return {
    id: crypto.randomUUID(),
    name: `Mesa ${index}`,
    weightG: 0,
    timeH: 0,
    timeM: 0,
    watts: 200,
    filamentId: "",
    modelType: "B",
    piecesInBed: 1,
    mixedItems: [],
    printerAssetId: "",
    safetyMarginPercent: 0,
  };
}

function newMixedItem(): CalcMixedItem {
  return { id: crypto.randomUUID(), description: "", weightG: 0, quantity: 1 };
}

function newSupplyLine(): SupplyLine {
  return { id: crypto.randomUUID(), supplyId: "", quantity: 0 };
}

export default function CalculatorPage() {
  const supabase = createClient();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [marketplaces, setMarketplaces] = useState<{ name: string; fee: number }[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState("");
  const [beds, setBeds] = useState<PrintBed[]>([newBed(1)]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [filamentModalBedId, setFilamentModalBedId] = useState<string | null>(null);
  const [kwhRate, setKwhRate] = useState(0.95);
  const [laborHours, setLaborHours] = useState(0.5);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [extras, setExtras] = useState(0);
  const [paintedByHand, setPaintedByHand] = useState(false);
  const [paintCost, setPaintCost] = useState(35);
  const [marketplaceFee, setMarketplaceFee] = useState(16);
  const [marginPercent, setMarginPercent] = useState(50);
  /** Quantidade de Produtos Finais do pedido — multiplica custo/preço por unidade, nunca os fixos (mão de obra/pintura/extras). */
  const [quantity, setQuantity] = useState(1);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyLines, setSupplyLines] = useState<SupplyLine[]>([]);
  const [printerAssets, setPrinterAssets] = useState<PrinterAsset[]>([]);
  const [energyConfigured, setEnergyConfigured] = useState(true);
  const [laborConfigured, setLaborConfigured] = useState(true);
  const [riskTiers, setRiskTiers] = useState<RiskTier[]>([]);
  const [selectedRiskTierId, setSelectedRiskTierId] = useState("");

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    loadMarketplaces();
    loadSupplies();
    loadFilaments();
    loadPrinterAssets();
    loadCalculatorSettings();
    loadRiskTiers();
  }, []);

  async function loadMarketplaces() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("settings")
      .select("marketplace_fees_json")
      .eq("user_id", user.id)
      .single();

    const feesObj = data?.marketplace_fees_json ?? {};
    setMarketplaces(Object.entries(feesObj).map(([name, fee]) => ({ name, fee: Number(fee) })));
  }

  async function loadSupplies() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("supplies").select("*").eq("user_id", user.id).order("name");
    setSupplies((data as Supply[]) ?? []);
  }

  async function loadFilaments() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("filaments").select("*").eq("user_id", user.id).order("material");
    setFilaments((data as Filament[]) ?? []);
  }

  async function loadPrinterAssets() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("printer_assets").select("*").eq("user_id", user.id).order("model");
    setPrinterAssets((data as PrinterAsset[]) ?? []);
  }

  async function loadCalculatorSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("settings")
      .select("electricity_kwh_rate, hourly_work_rate")
      .eq("user_id", user.id)
      .single();

    setEnergyConfigured(data?.electricity_kwh_rate != null);
    setLaborConfigured(data?.hourly_work_rate != null);
    if (data?.electricity_kwh_rate != null) setKwhRate(data.electricity_kwh_rate);
    if (data?.hourly_work_rate != null) setHourlyRate(data.hourly_work_rate);
  }

  async function loadRiskTiers() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("risk_tiers")
      .select("*")
      .eq("user_id", user.id)
      .order("extra_margin_percent");
    setRiskTiers((data as RiskTier[]) ?? []);
  }

  function handleSelectPrinterAsset(bedId: string, printerAssetId: string) {
    const printer = printerAssets.find((p) => p.id === printerAssetId);
    updateBed(bedId, {
      printerAssetId,
      ...(printer?.power_consumption_w != null ? { watts: printer.power_consumption_w } : {}),
    });
  }

  function handleFilamentSaved(filament: Filament) {
    setFilaments((prev) => [...prev, filament].sort((a, b) => a.material.localeCompare(b.material)));
    if (filamentModalBedId) updateBed(filamentModalBedId, { filamentId: filament.id });
    setFilamentModalBedId(null);
  }

  function addSupplyLine() {
    setSupplyLines((s) => [...s, newSupplyLine()]);
  }
  function removeSupplyLine(id: string) {
    setSupplyLines((s) => s.filter((line) => line.id !== id));
  }
  function updateSupplyLine(id: string, patch: Partial<SupplyLine>) {
    setSupplyLines((s) => s.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function handleSelectMarketplace(name: string) {
    setSelectedMarketplace(name);
    const mp = marketplaces.find((m) => m.name === name);
    if (mp) setMarketplaceFee(mp.fee);
  }

  /** Vínculo pro PDF de orçamento saber a qual produto recém-cadastrado se referir. */
  function handleNewProductCreated(product: Product) {
    setSelectedProductId(product.id);
    setProjectName(product.name);
    setNewProductModalOpen(false);
  }

  function addBed() {
    setBeds((b) => [...b, newBed(b.length + 1)]);
  }
  function removeBed(id: string) {
    setBeds((b) => (b.length > 1 ? b.filter((bed) => bed.id !== id) : b));
  }
  function updateBed(id: string, patch: Partial<PrintBed>) {
    setBeds((b) => b.map((bed) => (bed.id === id ? { ...bed, ...patch } : bed)));
  }
  function addMixedItem(bedId: string) {
    setBeds((b) => b.map((bed) => (bed.id === bedId ? { ...bed, mixedItems: [...bed.mixedItems, newMixedItem()] } : bed)));
  }
  function updateMixedItem(bedId: string, itemId: string, patch: Partial<CalcMixedItem>) {
    setBeds((b) =>
      b.map((bed) =>
        bed.id === bedId
          ? { ...bed, mixedItems: bed.mixedItems.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
          : bed
      )
    );
  }
  function removeMixedItem(bedId: string, itemId: string) {
    setBeds((b) =>
      b.map((bed) => (bed.id === bedId ? { ...bed, mixedItems: bed.mixedItems.filter((i) => i.id !== itemId) } : bed))
    );
  }

  const suppliesCost = useMemo(() => {
    return supplyLines.reduce((sum, line) => {
      const supply = supplies.find((s) => s.id === line.supplyId);
      if (!supply) return sum;
      return sum + supply.cost_per_unit * (line.quantity || 0);
    }, 0);
  }, [supplyLines, supplies]);

  // Resolve o preço/kg de cada mesa pelo filamento cadastrado selecionado nela
  // — sem filamento selecionado, a mesa não contribui custo de filamento
  // (bloqueado via `missingFilament` antes de deixar seguir pro pedido/produto).
  const calcBeds = useMemo(
    () =>
      beds.map((b) => ({
        name: b.name,
        weightG: b.weightG,
        timeH: b.timeH,
        timeM: b.timeM,
        watts: b.watts,
        filamentPricePerKg: filaments.find((f) => f.id === b.filamentId)?.price_per_kg ?? 0,
        safetyMarginPercent: b.safetyMarginPercent,
        modelType: b.modelType,
        piecesInBed: b.piecesInBed,
        mixedItems: b.mixedItems,
      })),
    [beds, filaments]
  );

  const selectedRiskTier = riskTiers.find((r) => r.id === selectedRiskTierId) ?? null;

  const calc = useMemo(
    () =>
      calculateCost({
        beds: calcBeds,
        kwhRate,
        laborHours,
        hourlyRate,
        extras,
        paintedByHand,
        paintCost,
        suppliesCost,
        marketplaceFee,
        marginPercent,
        riskMarginPercent: selectedRiskTier?.extra_margin_percent ?? 0,
        quantity,
      }),
    [
      calcBeds,
      kwhRate,
      laborHours,
      hourlyRate,
      extras,
      paintedByHand,
      paintCost,
      suppliesCost,
      marketplaceFee,
      marginPercent,
      selectedRiskTier,
      quantity,
    ]
  );

  // Snapshot da receita pra "Cadastrar Produto" no fim da tela — igual ao que
  // o overlay "Calcular Custo Unitário" monta, só que a partir do estado já
  // preenchido aqui, sem pedir pra digitar tudo de novo.
  const calcInputsForProduct: CalcInputs = useMemo(
    () => ({
      beds: beds.map(({ name, weightG, timeH, timeM, watts, filamentId, modelType, piecesInBed, mixedItems, safetyMarginPercent }) => ({
        name,
        weightG,
        timeH,
        timeM,
        watts,
        filamentId: filamentId || undefined,
        modelType,
        piecesInBed,
        mixedItems,
        safetyMarginPercent,
      })),
      kwhRate,
      laborHours,
      hourlyRate,
      extras,
      paintedByHand,
      paintCost,
      marketplaceFee,
      marginPercent,
      quantity: 1,
    }),
    [beds, kwhRate, laborHours, hourlyRate, extras, paintedByHand, paintCost, marketplaceFee, marginPercent]
  );

  const missingFilament = beds.some((b) => !b.filamentId);
  // Mesas Mix (Modelo C) não contribuem pro custo do produto principal — sem
  // ao menos uma mesa Peça única/Montagem ou Lote, costPerUnit fica 0.
  const noUnitBeds = beds.every((b) => b.modelType === "C");
  const actionsDisabled = missingFilament || noUnitBeds;

  // Snapshot estável dos insumos selecionados aqui — só muda quando o usuário
  // de fato edita a lista, pra não resetar a seção "Insumo(s) Utilizados" da
  // Venda Manual enquanto ela estiver aberta por cima desta tela. Insumo é
  // "por unidade" — multiplica pela Quantidade de Produtos Finais aqui, já
  // que é isso que de fato sai do estoque ao confirmar o pedido inteiro.
  const usedSuppliesForSale = useMemo(() => {
    const qty = Math.max(quantity, 1);
    return supplyLines
      .filter((l) => l.supplyId)
      .map((l) => ({ supplyId: l.supplyId, quantity: l.quantity ? String(l.quantity * qty) : "" }));
  }, [supplyLines, quantity]);

  // O filamento de cada mesa já é o total real que sai do carretel — NÃO
  // multiplica pela Quantidade de Produtos Finais (diferente dos insumos).
  const usedFilamentsForSale = useMemo(
    () =>
      beds
        .filter((b) => b.filamentId)
        .map((b) => ({ filamentId: b.filamentId, quantityG: b.weightG ? String(b.weightG) : "" })),
    [beds]
  );

  return (
    <>
      <Topbar title="Calculadora Inteligente" />

      {!energyConfigured && (
        <ConfigNudgeBanner
          id="energy-rate"
          message="Configure sua tarifa de energia para cálculos mais precisos."
          ctaLabel="Configurar agora"
          ctaHref="/dashboard/settings#energy"
        />
      )}
      {!laborConfigured && (
        <ConfigNudgeBanner
          id="labor-rate"
          message="Configure o valor padrão da sua mão de obra para cálculos mais precisos."
          ctaLabel="Configurar agora"
          ctaHref="/dashboard/settings#labor"
        />
      )}

      <main className="grid grid-cols-1 gap-6 px-6 py-8 md:px-8 xl:grid-cols-[1fr_360px]">
        {/* Left column: inputs */}
        <div className="space-y-6">
          <GlassCard padding="lg" className="space-y-3">
            <label className="block text-xs text-text-muted">Nome do produto</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="glass-input w-full text-base"
              placeholder="Ex: Vaso Geométrico Torcido"
            />
          </GlassCard>

          {/* Print beds */}
          <GlassCard padding="lg" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
                Mesas de Impressão
              </h3>
              <NeonButton variant="outline" size="sm" onClick={addBed} className="whitespace-nowrap">
                <Plus size={14} /> Adicionar mesa
              </NeonButton>
            </div>
            <p className="-mt-3 text-[11px] text-text-muted">
              Peso e tempo são sempre da mesa cheia, direto do fatiador. Escolha o tipo de cada mesa: <strong>Peça
              única/Montagem</strong> (mesa inteira = 1 contribuição pro custo do produto), <strong>Lote</strong>
              (várias peças idênticas dividem o custo da mesa) ou <strong>Mix</strong> (peças diferentes, custo
              rateado por peso entre elas — não entra no preço do produto principal).
            </p>

            {beds.map((bed) => {
              const cIndex = beds.filter((b) => b.modelType === "C").findIndex((b) => b.id === bed.id);
              const mixedBreakdown = bed.modelType === "C" && cIndex >= 0 ? calc.mixedBreakdowns[cIndex] : undefined;
              const mixedItemsWeight = bed.mixedItems.reduce((s, i) => s + (i.weightG || 0) * (i.quantity || 0), 0);

              return (
              <div key={bed.id} className="glass-card space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <input
                    value={bed.name}
                    onChange={(e) => updateBed(bed.id, { name: e.target.value })}
                    className="bg-transparent text-sm font-medium text-text-primary focus:outline-none"
                  />
                  {beds.length > 1 && (
                    <button
                      onClick={() => removeBed(bed.id)}
                      className="text-text-muted hover:text-red-400"
                      aria-label="Remover mesa"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <SegmentedControl
                  options={BED_MODEL_OPTIONS}
                  value={bed.modelType}
                  onChange={(v) => updateBed(bed.id, { modelType: v })}
                />

                {printerAssets.length > 0 && (
                  <Field label="Impressora utilizada (opcional, preenche a potência)">
                    <select
                      value={bed.printerAssetId}
                      onChange={(e) => handleSelectPrinterAsset(bed.id, e.target.value)}
                      className="glass-input w-full"
                    >
                      <option value="" className="bg-bg-raised">
                        Nenhuma / preencher manualmente
                      </option>
                      {printerAssets.map((p) => (
                        <option key={p.id} value={p.id} className="bg-bg-raised">
                          {p.model}
                          {p.power_consumption_w != null ? ` (${p.power_consumption_w}W)` : " (sem consumo cadastrado)"}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Peso (g)">
                    <input
                      type="number"
                      min={0}
                      value={bed.weightG || ""}
                      onChange={(e) => updateBed(bed.id, { weightG: Number(e.target.value) })}
                      className="glass-input w-full"
                    />
                  </Field>
                  <Field label="Tempo (h)">
                    <input
                      type="number"
                      min={0}
                      value={bed.timeH || ""}
                      onChange={(e) => updateBed(bed.id, { timeH: Number(e.target.value) })}
                      className="glass-input w-full"
                    />
                  </Field>
                  <Field label="Tempo (min)">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={bed.timeM || ""}
                      onChange={(e) => updateBed(bed.id, { timeM: Number(e.target.value) })}
                      className="glass-input w-full"
                    />
                  </Field>
                  <Field label="Potência (W)">
                    <input
                      type="number"
                      min={0}
                      value={bed.watts || ""}
                      onChange={(e) => updateBed(bed.id, { watts: Number(e.target.value) })}
                      className="glass-input w-full"
                    />
                  </Field>
                </div>

                <div
                  className={cn(
                    "grid grid-cols-2 gap-3 sm:items-end",
                    bed.modelType === "A" ? "sm:grid-cols-[140px_160px_1fr]" : "sm:grid-cols-[160px_1fr]"
                  )}
                >
                  {bed.modelType === "A" && (
                    <Field label="Peças idênticas nesta mesa">
                      <input
                        type="number"
                        min={1}
                        value={bed.piecesInBed || ""}
                        onChange={(e) => updateBed(bed.id, { piecesInBed: Number(e.target.value) })}
                        className="glass-input w-full"
                      />
                    </Field>
                  )}
                  <Field label="Margem de segurança (%, opcional)">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={bed.safetyMarginPercent || ""}
                      onChange={(e) => updateBed(bed.id, { safetyMarginPercent: Math.max(0, Number(e.target.value)) })}
                      className="glass-input w-full"
                      placeholder="5-10%"
                    />
                  </Field>
                  <div className="col-span-2 sm:col-span-1">
                    <Field label="Filamento">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <FilamentPickerDropdown
                            filaments={filaments}
                            value={bed.filamentId}
                            onChange={(id) => updateBed(bed.id, { filamentId: id })}
                          />
                        </div>
                        <NeonButton
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setFilamentModalBedId(bed.id)}
                        >
                          <Plus size={14} /> Cadastrar
                        </NeonButton>
                      </div>
                    </Field>
                  </div>
                </div>

                {bed.modelType === "A" && bed.piecesInBed > 1 && (
                  <p className="text-[11px] text-neon-green">
                    ≈ {Math.round(bed.weightG / bed.piecesInBed)}g e{" "}
                    {Math.round((bed.timeH * 60 + bed.timeM) / bed.piecesInBed)}min por peça — custo desta mesa
                    dividido por {bed.piecesInBed}
                  </p>
                )}

                {bed.modelType === "C" && (
                  <div className="space-y-2 rounded-xl border border-border-glass bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-text-secondary">Itens diferentes nesta mesa</p>
                      <NeonButton type="button" variant="outline" size="sm" onClick={() => addMixedItem(bed.id)}>
                        <Plus size={12} /> Adicionar item
                      </NeonButton>
                    </div>

                    {bed.mixedItems.length === 0 && (
                      <p className="text-[11px] text-text-muted">Nenhum item adicionado ainda.</p>
                    )}

                    {bed.mixedItems.map((item, itemIdx) => {
                      const itemResult = mixedBreakdown?.items[itemIdx];
                      return (
                        <div key={item.id} className="grid grid-cols-[1fr_80px_60px_auto] items-end gap-2">
                          <Field label="Descrição">
                            <input
                              value={item.description}
                              onChange={(e) => updateMixedItem(bed.id, item.id, { description: e.target.value })}
                              className="glass-input w-full"
                              placeholder="Ex: Chaveiro Gato"
                            />
                          </Field>
                          <Field label="Peso un. (g)">
                            <input
                              type="number"
                              min={0}
                              value={item.weightG || ""}
                              onChange={(e) => updateMixedItem(bed.id, item.id, { weightG: Number(e.target.value) })}
                              className="glass-input w-full"
                            />
                          </Field>
                          <Field label="Qtd">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity || ""}
                              onChange={(e) => updateMixedItem(bed.id, item.id, { quantity: Number(e.target.value) })}
                              className="glass-input w-full"
                            />
                          </Field>
                          <button
                            type="button"
                            onClick={() => removeMixedItem(bed.id, item.id)}
                            className="mb-2.5 text-text-muted hover:text-red-400"
                            aria-label="Remover item"
                          >
                            <Trash2 size={14} />
                          </button>
                          {itemResult && (
                            <p className="col-span-4 -mt-1 text-[11px] text-neon-green">
                              Custo do item: {formatBRL(itemResult.itemTotalCost)} total —{" "}
                              {formatBRL(itemResult.itemUnitCost)}/un.
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {bed.mixedItems.length > 0 && (
                      <p
                        className={cn(
                          "text-[11px]",
                          Math.round(mixedItemsWeight) === Math.round(bed.weightG)
                            ? "text-text-muted"
                            : "text-amber-400"
                        )}
                      >
                        Peso total dos itens: {mixedItemsWeight}g
                        {Math.round(mixedItemsWeight) !== Math.round(bed.weightG) &&
                          ` — não bate com o peso da mesa (${bed.weightG}g)`}
                      </p>
                    )}
                    <p className="text-[11px] text-text-muted">
                      Custo desta mesa ({mixedBreakdown ? formatBRL(mixedBreakdown.totalBedCost) : formatBRL(0)}) é só
                      rateado por peso entre os itens acima — não entra no custo do produto principal desta
                      Calculadora. Cadastre cada item separadamente usando o custo unitário dele.
                    </p>
                  </div>
                )}

                {bed.safetyMarginPercent > 0 && (
                  <p className="text-[11px] text-neon-pink">
                    Considerando +{bed.safetyMarginPercent}% de margem no custo: {Math.round(bed.weightG * (1 + bed.safetyMarginPercent / 100))}g e{" "}
                    {Math.round((bed.timeH * 60 + bed.timeM) * (1 + bed.safetyMarginPercent / 100))}min
                  </p>
                )}
                {!bed.filamentId && (
                  <p className="text-[11px] text-amber-400">Selecione um filamento cadastrado pra calcular o custo desta mesa.</p>
                )}
              </div>
              );
            })}
          </GlassCard>

          {/* Costs & extras */}
          <GlassCard padding="lg" className="space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              Custos e Consumíveis
            </h3>
            <p className="-mt-3 text-[11px] text-text-muted">
              Fixos por pedido — não multiplicam pela Quantidade de Produtos Finais.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Tarifa energia (R$/kWh)">
                <CurrencyInput value={String(kwhRate)} onChange={(v) => setKwhRate(v === "" ? 0 : Number(v))} />
              </Field>
              <Field label="Mão de obra (h)">
                <input type="number" step="0.1" min={0} value={laborHours || ""} onChange={(e) => setLaborHours(Number(e.target.value))} className="glass-input w-full" />
              </Field>
              <Field label="Valor hora (R$)">
                <CurrencyInput value={String(hourlyRate)} onChange={(v) => setHourlyRate(v === "" ? 0 : Number(v))} />
              </Field>
              <Field label="Consumíveis extras (R$)">
                <CurrencyInput value={String(extras)} onChange={(v) => setExtras(v === "" ? 0 : Number(v))} />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-glass pt-4">
              <Toggle checked={paintedByHand} onChange={setPaintedByHand} label="Pintado à mão" />
              {paintedByHand && (
                <Field label="Custo de pintura (R$)">
                  <CurrencyInput
                    value={String(paintCost)}
                    onChange={(v) => setPaintCost(v === "" ? 0 : Number(v))}
                    className="w-32"
                  />
                </Field>
              )}
            </div>
          </GlassCard>

          {/* Insumos */}
          <GlassCard padding="lg" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Insumos Utilizados</h3>
              <NeonButton variant="outline" size="sm" onClick={addSupplyLine} disabled={supplies.length === 0} className="whitespace-nowrap">
                <Plus size={14} /> Adicionar insumo
              </NeonButton>
            </div>
            {supplies.length === 0 ? (
              <p className="text-xs text-text-muted">Nenhum insumo cadastrado em Cadastros → Insumos.</p>
            ) : supplyLines.length === 0 ? (
              <p className="text-xs text-text-muted">Nenhum insumo adicionado ainda (opcional).</p>
            ) : (
              supplyLines.map((line) => {
                const supply = supplies.find((s) => s.id === line.supplyId);
                return (
                  <div key={line.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Field label="Insumo">
                        <select
                          value={line.supplyId}
                          onChange={(e) => updateSupplyLine(line.id, { supplyId: e.target.value })}
                          className="glass-input w-full"
                        >
                          <option value="" className="bg-bg-raised">
                            Selecione...
                          </option>
                          {supplies.map((s) => (
                            <option key={s.id} value={s.id} className="bg-bg-raised">
                              {s.name} ({formatBRL(s.cost_per_unit)}/{s.unit})
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="w-28">
                      <Field label={`Qtd/unidade (${supply?.unit ?? "un"})`}>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.quantity || ""}
                          onChange={(e) => updateSupplyLine(line.id, { quantity: Number(e.target.value) })}
                          className="glass-input w-full"
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSupplyLine(line.id)}
                      className="mb-2.5 shrink-0 text-text-muted hover:text-red-400"
                      aria-label="Remover insumo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
            <p className="text-[11px] text-text-muted">
              A quantidade informada é o consumo de UMA unidade — o total do pedido multiplica pela Quantidade de
              Produtos Finais. Só entra no orçamento; o estoque só é baixado quando o pedido for de fato confirmado.
            </p>
          </GlassCard>

          {/* Pricing */}
          <GlassCard padding="lg" className="space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              Precificação
            </h3>
            <MarginSlider value={marginPercent} onChange={setMarginPercent} />

            <Field label="Taxa de marketplace">
              <div className="space-y-2">
                <select
                  value={selectedMarketplace}
                  onChange={(e) => handleSelectMarketplace(e.target.value)}
                  className="glass-input w-full"
                >
                  <option value="" className="bg-bg-raised">
                    {marketplaces.length === 0 ? "Nenhum cadastrado em Configurações" : "Selecione..."}
                  </option>
                  {marketplaces.map((mp) => (
                    <option key={mp.name} value={mp.name} className="bg-bg-raised">
                      {mp.name} ({mp.fee}%)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={marketplaceFee || ""}
                  onChange={(e) => setMarketplaceFee(Math.min(Math.max(Number(e.target.value), 0), 99))}
                  className="glass-input w-full"
                  placeholder="Ajustar % manualmente"
                />
                {marketplaceFee >= 99 && (
                  <p className="text-[11px] text-amber-400">Taxa limitada a 99% — acima disso o preço não faz sentido matematicamente.</p>
                )}
              </div>
            </Field>

            {riskTiers.length > 0 && (
              <Field label="Nível de risco (opcional)">
                <select
                  value={selectedRiskTierId}
                  onChange={(e) => setSelectedRiskTierId(e.target.value)}
                  className="glass-input w-full"
                >
                  <option value="" className="bg-bg-raised">
                    Nenhum
                  </option>
                  {riskTiers.map((r) => (
                    <option key={r.id} value={r.id} className="bg-bg-raised">
                      {r.name} (+{r.extra_margin_percent}%)
                    </option>
                  ))}
                </select>
                {selectedRiskTier?.description && (
                  <p className="mt-1.5 text-[11px] text-text-muted">{selectedRiskTier.description}</p>
                )}
              </Field>
            )}
          </GlassCard>

        </div>

        {/* Right column: summary + actions */}
        <div className="space-y-6">
          <GlassCard padding="lg" className="space-y-5 xl:sticky xl:top-[80px]">
            <h3 className="neon-text text-2xl font-bold uppercase tracking-wider">Resumo</h3>

            <Field label="Quantidade de Produtos Finais">
              <input
                type="number"
                min={1}
                value={quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="glass-input w-full"
              />
            </Field>

            <div className="space-y-2 text-sm">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted/70">Por Unidade</p>
              <SummaryRow label="Peso total" value={`${calc.totalWeightG.toFixed(0)} g`} />
              <SummaryRow label="Tempo total" value={`${calc.totalHours.toFixed(1)} h`} />
              <SummaryRow label="Filamento" value={formatBRL(calc.filamentCost)} />
              <SummaryRow label="Energia" value={formatBRL(calc.energyCost)} />
              {suppliesCost > 0 && <SummaryRow label="Insumos" value={formatBRL(calc.suppliesCost)} />}
            </div>

            <div className="space-y-2 border-t border-border-glass pt-4 text-sm">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted/70">
                Fixos do pedido (não multiplicam)
              </p>
              <SummaryRow label="Mão de obra" value={formatBRL(calc.laborCost)} />
              {paintedByHand && <SummaryRow label="Pintura" value={formatBRL(calc.paint)} />}
              <SummaryRow label="Extras" value={formatBRL(extras)} />
            </div>

            <div className="space-y-2 border-t border-border-glass pt-4 text-sm">
              <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted/70">
                Total do Pedido {quantity > 1 && `(${quantity} unidades)`}
              </p>
              <SummaryRow label="Custo Total do Pedido" value={formatBRL(calc.orderCost)} />
            </div>

            <div className="glass-card space-y-1 p-4 text-center">
              <p className="text-xs text-text-muted">Valor Total do Pedido</p>
              <p className="neon-text font-numeric text-3xl font-semibold">{formatBRL(calc.orderPrice)}</p>
              {quantity > 1 && (
                <p className="font-numeric text-xs text-text-muted">{formatBRL(calc.pricePerUnit)} / unidade</p>
              )}
            </div>

            <div className="space-y-2">
              <NeonButton className="w-full" onClick={() => setOrderModalOpen(true)} disabled={actionsDisabled}>
                <Rocket size={16} /> Criar Pedido
              </NeonButton>
              <NeonButton variant="outline" className="w-full" onClick={() => setQuoteModalOpen(true)} disabled={actionsDisabled}>
                <FileDown size={16} /> Gerar PDF de Orçamento
              </NeonButton>
              <NeonButton variant="outline" className="w-full">
                <Link2 size={16} /> Gerar Link de Cobrança
              </NeonButton>
            </div>
            {missingFilament && (
              <p className="text-center text-[11px] text-amber-400">
                Selecione um filamento cadastrado em cada mesa pra liberar essas ações.
              </p>
            )}
            {!missingFilament && noUnitBeds && (
              <p className="text-center text-[11px] text-amber-400">
                Adicione ao menos uma mesa Peça única/Montagem ou Lote — mesas Mix sozinhas não definem o preço do
                produto principal.
              </p>
            )}
          </GlassCard>
        </div>
      </main>

      <div className="px-6 pb-8 md:px-8">
        <GlassCard padding="lg" className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h3 className="font-display text-lg">Gostou do resultado?</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Salve essa receita e o preço calculado como um produto — pra reaproveitar depois, sem refazer a conta.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-end">
            <NeonButton className="w-full sm:w-auto" onClick={() => setNewProductModalOpen(true)} disabled={actionsDisabled}>
              <PackagePlus size={18} /> Cadastrar Produto
            </NeonButton>
            {missingFilament && (
              <p className="text-[11px] text-amber-400">Selecione um filamento em cada mesa pra liberar.</p>
            )}
            {!missingFilament && noUnitBeds && (
              <p className="text-[11px] text-amber-400">Adicione uma mesa Peça única/Montagem ou Lote pra liberar.</p>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="px-6 pb-8 md:px-8">
        <CalculatorTips />
      </div>

      <NewSaleModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        initialProjectName={projectName}
        initialFinalPrice={calc.orderPrice}
        weightG={calc.totalWeightG}
        printTimeMin={calc.totalHours * 60}
        energyCost={calc.energyCost}
        filamentCost={calc.filamentCost}
        marginPercent={marginPercent}
        initialUsedFilaments={usedFilamentsForSale}
        initialUsedSupplies={usedSuppliesForSale}
      />
      <NewProductModal
        open={newProductModalOpen}
        onClose={() => setNewProductModalOpen(false)}
        onCreated={handleNewProductCreated}
        initialName={projectName}
        initialCostPrice={calc.costPerUnit}
        initialSalePrice={calc.pricePerUnit}
        calcInputs={calcInputsForProduct}
      />
      <FilamentModal
        open={filamentModalBedId !== null}
        onClose={() => setFilamentModalBedId(null)}
        onSaved={handleFilamentSaved}
      />
      <GenerateQuoteModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        summary={{
          projectName,
          quantity,
          finalPrice: calc.orderPrice,
          pricePerPiece: calc.pricePerUnit,
          weightG: calc.totalWeightG,
          printTimeMin: calc.totalHours * 60,
          energyCost: calc.energyCost,
          filamentCost: calc.filamentCost,
          marginPercent,
          productId: selectedProductId || undefined,
        }}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] text-text-muted">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-text-secondary">
      <span>{label}</span>
      <span className="font-numeric text-text-primary">{value}</span>
    </div>
  );
}

const TIP_COLUMNS: { icon: typeof Weight; title: string; items: string[] }[] = [
  {
    icon: Weight,
    title: "Peso da Peça",
    items: [
      "Use o peso estimado pelo fatiador",
      "Inclua suportes e preenchimento",
      "Considere material de purga entre cores",
    ],
  },
  {
    icon: Timer,
    title: "Tempo de Impressão",
    items: [
      "Use o tempo total do fatiador",
      "Considere tempo de aquecimento",
      "Use a margem de segurança para prever falhas (5-10%)",
    ],
  },
  {
    icon: Zap,
    title: "Consumo da Máquina",
    items: [
      "Selecione a impressora cadastrada para preencher automaticamente",
      "Configure o consumo de cada impressora em Cadastros > Impressoras",
    ],
  },
  {
    icon: TrendingUp,
    title: "Margem de Lucro",
    items: [
      "40-50% é um ponto de partida comum, ajuste conforme a complexidade da peça",
      "Considere o tempo de pós-processamento (lixar, pintar, montar) na sua margem",
      "Lembre-se: aqui a margem é sobre o preço de venda, não sobre o custo — valores acima de 99% não são permitidos",
    ],
  },
];

function CalculatorTips() {
  return (
    <GlassCard padding="lg" className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon-gradient-soft text-neon-pink">
          <Info size={14} />
        </span>
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
          Dicas pra um cálculo mais preciso
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {TIP_COLUMNS.map((col) => (
          <div key={col.title} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-neon-pink">
                <col.icon size={13} />
              </span>
              <p className="text-xs font-semibold text-text-primary">{col.title}</p>
            </div>
            <ul className="space-y-1.5 pl-1">
              {col.items.map((item) => (
                <li key={item} className="flex gap-1.5 text-[11px] leading-relaxed text-text-secondary">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-muted" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
