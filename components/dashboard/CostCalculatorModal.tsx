"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { MarginSlider } from "@/components/ui/MarginSlider";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { Toggle } from "@/components/ui/Toggle";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { calculateCost, bedCostBreakdown, type CalcBed, type CalcMixedItem } from "@/lib/costCalculator";
import type { CalcInputs, Filament, Supply, PrinterAsset, RiskTier } from "@/lib/types";

type BedModelType = "A" | "B" | "C";

const BED_MODEL_OPTIONS: { value: BedModelType; label: string }[] = [
  { value: "B", label: "Peça única / Montagem" },
  { value: "A", label: "Lote (peças idênticas)" },
  { value: "C", label: "Mix (peças diferentes)" },
];

interface Bed extends CalcBed {
  id: string;
  name: string;
  filamentId: string;
  printerAssetId: string;
  modelType: BedModelType;
  piecesInBed: number;
  mixedItems: CalcMixedItem[];
}

interface SupplyLine {
  id: string;
  supplyId: string;
  quantity: number;
}

function newBed(index: number): Bed {
  return {
    id: crypto.randomUUID(),
    name: `Mesa ${index}`,
    weightG: 0,
    timeH: 0,
    timeM: 0,
    watts: 200,
    filamentId: "",
    printerAssetId: "",
    safetyMarginPercent: 0,
    modelType: "B",
    piecesInBed: 1,
    mixedItems: [],
  };
}

function newMixedItem(): CalcMixedItem {
  return { id: crypto.randomUUID(), description: "", weightG: 0, quantity: 1 };
}

function newSupplyLine(): SupplyLine {
  return { id: crypto.randomUUID(), supplyId: "", quantity: 0 };
}

interface CostCalculatorModalProps {
  open: boolean;
  onClose: () => void;
  /** `calcInputs` reflete as mesas/filamento/margem usados aqui — pra Cadastrar Produto salvar junto e a Calculadora Inteligente conseguir recarregar tudo depois. */
  onApply: (costPrice: number, salePrice: number, calcInputs: CalcInputs) => void;
}

export function CostCalculatorModal({ open, onClose, onApply }: CostCalculatorModalProps) {
  const supabase = createClient();
  const [beds, setBeds] = useState<Bed[]>([newBed(1)]);
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(120);
  const [kwhRate, setKwhRate] = useState(0.95);
  const [laborHours, setLaborHours] = useState(0.5);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [extras, setExtras] = useState(0);
  const [paintedByHand, setPaintedByHand] = useState(false);
  const [paintCost, setPaintCost] = useState(35);
  const [marginPercent, setMarginPercent] = useState(50);
  const [marketplaces, setMarketplaces] = useState<{ name: string; fee: number }[]>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState("");
  const [marketplaceFee, setMarketplaceFee] = useState(0);
  const [riskTiers, setRiskTiers] = useState<RiskTier[]>([]);
  const [selectedRiskTierId, setSelectedRiskTierId] = useState("");
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [printerAssets, setPrinterAssets] = useState<PrinterAsset[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyLines, setSupplyLines] = useState<SupplyLine[]>([]);

  useEffect(() => {
    if (!open) return;
    setBeds([newBed(1)]);
    setMarginPercent(50);
    setSelectedMarketplace("");
    setMarketplaceFee(0);
    setSelectedRiskTierId("");
    setSupplyLines([]);
    setLaborHours(0.5);
    setExtras(0);
    setPaintedByHand(false);
    setPaintCost(35);
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadReferenceData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: settings }, { data: filamentsData }, { data: printerAssetsData }, { data: suppliesData }, { data: riskTiersData }] =
      await Promise.all([
        supabase.from("settings").select("electricity_kwh_rate, hourly_work_rate, marketplace_fees_json").eq("user_id", user.id).single(),
        supabase.from("filaments").select("*").eq("user_id", user.id).order("brand"),
        supabase.from("printer_assets").select("*").eq("user_id", user.id).order("model"),
        supabase.from("supplies").select("*").eq("user_id", user.id).order("name"),
        supabase.from("risk_tiers").select("*").eq("user_id", user.id).order("extra_margin_percent"),
      ]);

    if (settings?.electricity_kwh_rate != null) setKwhRate(Number(settings.electricity_kwh_rate));
    if (settings?.hourly_work_rate != null) setHourlyRate(Number(settings.hourly_work_rate));
    const feesObj = settings?.marketplace_fees_json ?? {};
    setMarketplaces(Object.entries(feesObj).map(([name, fee]) => ({ name, fee: Number(fee) })));
    setFilaments((filamentsData as Filament[]) ?? []);
    setPrinterAssets((printerAssetsData as PrinterAsset[]) ?? []);
    setSupplies((suppliesData as Supply[]) ?? []);
    setRiskTiers((riskTiersData as RiskTier[]) ?? []);
  }

  function addBed() {
    setBeds((b) => [...b, newBed(b.length + 1)]);
  }
  function removeBed(id: string) {
    setBeds((b) => (b.length > 1 ? b.filter((bed) => bed.id !== id) : b));
  }
  function updateBed(id: string, patch: Partial<Bed>) {
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

  function handleSelectPrinterAsset(bedId: string, printerAssetId: string) {
    const printer = printerAssets.find((p) => p.id === printerAssetId);
    updateBed(bedId, {
      printerAssetId,
      ...(printer?.power_consumption_w != null ? { watts: printer.power_consumption_w } : {}),
    });
  }

  function handleSelectMarketplace(name: string) {
    setSelectedMarketplace(name);
    const mp = marketplaces.find((m) => m.name === name);
    if (mp) setMarketplaceFee(mp.fee);
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

  const suppliesCost = useMemo(() => {
    return supplyLines.reduce((sum, line) => {
      const supply = supplies.find((s) => s.id === line.supplyId);
      if (!supply) return sum;
      return sum + supply.cost_per_unit * (line.quantity || 0);
    }, 0);
  }, [supplyLines, supplies]);

  const calcBeds = useMemo(
    () =>
      beds.map((b) => ({
        name: b.name,
        weightG: b.weightG,
        timeH: b.timeH,
        timeM: b.timeM,
        watts: b.watts,
        filamentPricePerKg: filaments.find((f) => f.id === b.filamentId)?.price_per_kg ?? filamentPricePerKg,
        safetyMarginPercent: b.safetyMarginPercent,
        modelType: b.modelType,
        piecesInBed: b.piecesInBed,
        mixedItems: b.mixedItems,
      })),
    [beds, filaments, filamentPricePerKg]
  );

  const noUnitBeds = beds.every((b) => b.modelType === "C");
  // Só quando TODAS as mesas que contam pro custo são Lote o valor abaixo
  // representa a mesa inteira (batch) — com Peça única/Montagem no meio,
  // volta a ser "unitário" (peça/montagem ou soma delas).
  const unitBeds = beds.filter((b) => b.modelType !== "C");
  const isLoteOnly = unitBeds.length > 0 && unitBeds.every((b) => b.modelType === "A");

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
        quantity: 1,
      }),
    [calcBeds, kwhRate, laborHours, hourlyRate, extras, paintedByHand, paintCost, suppliesCost, marketplaceFee, marginPercent, selectedRiskTier]
  );

  function handleApply() {
    const calcInputs: CalcInputs = {
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
    };
    onApply(calc.costPerUnit, calc.pricePerUnit, calcInputs);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calcular Custo Unitário"
      zIndexClass="z-[70]"
      maxWidthClass="max-w-2xl"
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
        {/* Mesas de impressão */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Mesas de Impressão</h4>
            <NeonButton type="button" variant="outline" size="sm" onClick={addBed} className="whitespace-nowrap">
              <Plus size={14} /> Adicionar mesa
            </NeonButton>
          </div>
          {beds.map((bed) => {
            const cIndex = beds.filter((b) => b.modelType === "C").findIndex((b) => b.id === bed.id);
            const mixedBreakdown = bed.modelType === "C" && cIndex >= 0 ? calc.mixedBreakdowns[cIndex] : undefined;
            const mixedItemsWeight = bed.mixedItems.reduce((s, i) => s + (i.weightG || 0) * (i.quantity || 0), 0);
            const bedFilamentPricePerKg = filaments.find((f) => f.id === bed.filamentId)?.price_per_kg ?? filamentPricePerKg;
            const bedCost =
              bed.modelType !== "C"
                ? bedCostBreakdown(
                    {
                      weightG: bed.weightG,
                      timeH: bed.timeH,
                      timeM: bed.timeM,
                      watts: bed.watts,
                      filamentPricePerKg: bedFilamentPricePerKg,
                      safetyMarginPercent: bed.safetyMarginPercent,
                    },
                    kwhRate,
                    bedFilamentPricePerKg
                  )
                : null;

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
                    type="button"
                    onClick={() => removeBed(bed.id)}
                    className="text-text-muted hover:text-red-400"
                    aria-label="Remover mesa"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <select
                value={bed.modelType}
                onChange={(e) => updateBed(bed.id, { modelType: e.target.value as BedModelType })}
                className="glass-input w-full sm:hidden"
              >
                {BED_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-bg-raised">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="hidden sm:block">
                <SegmentedControl
                  options={BED_MODEL_OPTIONS}
                  value={bed.modelType}
                  onChange={(v) => updateBed(bed.id, { modelType: v })}
                />
              </div>

              {printerAssets.length > 0 && (
                <MiniField label="Impressora utilizada (opcional, preenche a potência)">
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
                </MiniField>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniField label={`Peso (g) por ${bed.modelType === "B" ? "peça" : "mesa"}`}>
                  <input
                    type="number"
                    min={0}
                    value={bed.weightG || ""}
                    onChange={(e) => updateBed(bed.id, { weightG: Number(e.target.value) })}
                    className="glass-input w-full"
                  />
                </MiniField>
                <MiniField label={`Tempo (h) por ${bed.modelType === "B" ? "peça" : "mesa"}`}>
                  <input
                    type="number"
                    min={0}
                    value={bed.timeH || ""}
                    onChange={(e) => updateBed(bed.id, { timeH: Number(e.target.value) })}
                    className="glass-input w-full"
                  />
                </MiniField>
                <MiniField label={`Tempo (min) por ${bed.modelType === "B" ? "peça" : "mesa"}`}>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={bed.timeM || ""}
                    onChange={(e) => updateBed(bed.id, { timeM: Number(e.target.value) })}
                    className="glass-input w-full"
                  />
                </MiniField>
                <MiniField label="Potência (W)">
                  <input
                    type="number"
                    min={0}
                    value={bed.watts || ""}
                    onChange={(e) => updateBed(bed.id, { watts: Number(e.target.value) })}
                    className="glass-input w-full"
                  />
                </MiniField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniField label="Margem de segurança (%, opcional)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bed.safetyMarginPercent || ""}
                    onChange={(e) => updateBed(bed.id, { safetyMarginPercent: Math.max(0, Number(e.target.value)) })}
                    className="glass-input w-full"
                    placeholder="5-10%"
                  />
                </MiniField>
                <MiniField label="Filamento">
                  <select
                    value={bed.filamentId}
                    onChange={(e) => updateBed(bed.id, { filamentId: e.target.value })}
                    className="glass-input w-full"
                  >
                    <option value="" className="bg-bg-raised">
                      {filaments.length === 0 ? "Nenhum cadastrado" : "Selecione..."}
                    </option>
                    {filaments.map((f) => (
                      <option key={f.id} value={f.id} className="bg-bg-raised">
                        {f.material} — {f.brand} ({formatBRL(f.price_per_kg)}/kg)
                      </option>
                    ))}
                  </select>
                </MiniField>
              </div>
              {!bed.filamentId && (
                <MiniField label="Filamento (R$/kg) — sem filamento cadastrado selecionado">
                  <CurrencyInput
                    value={String(filamentPricePerKg)}
                    onChange={(v) => setFilamentPricePerKg(v === "" ? 0 : Number(v))}
                  />
                </MiniField>
              )}

              {(bed.modelType === "A" || bed.modelType === "B") && bedCost && (
                <p className="text-[11px] text-neon-green">
                  Custo desta mesa: {formatBRL(bedCost.totalCost)} ({formatBRL(bedCost.filamentCost)} filamento +{" "}
                  {formatBRL(bedCost.energyCost)} energia)
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
                        <MiniField label="Descrição">
                          <input
                            value={item.description}
                            onChange={(e) => updateMixedItem(bed.id, item.id, { description: e.target.value })}
                            className="glass-input w-full"
                            placeholder="Ex: Chaveiro Gato"
                          />
                        </MiniField>
                        <MiniField label="Peso un. (g)">
                          <input
                            type="number"
                            min={0}
                            value={item.weightG || ""}
                            onChange={(e) => updateMixedItem(bed.id, item.id, { weightG: Number(e.target.value) })}
                            className="glass-input w-full"
                          />
                        </MiniField>
                        <MiniField label="Qtd">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity || ""}
                            onChange={(e) => updateMixedItem(bed.id, item.id, { quantity: Number(e.target.value) })}
                            className="glass-input w-full"
                          />
                        </MiniField>
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
                        Math.round(mixedItemsWeight) === Math.round(bed.weightG) ? "text-text-muted" : "text-amber-400"
                      )}
                    >
                      Peso total dos itens: {mixedItemsWeight}g
                      {Math.round(mixedItemsWeight) !== Math.round(bed.weightG) &&
                        ` — não bate com o peso da mesa (${bed.weightG}g)`}
                    </p>
                  )}
                  <p className="text-[11px] text-text-muted">
                    Custo desta mesa ({mixedBreakdown ? formatBRL(mixedBreakdown.totalBedCost) : formatBRL(0)}) é só
                    rateado por peso entre os itens acima — não entra no custo do produto principal.
                  </p>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Custos e consumíveis */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Custos e Consumíveis</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniField label="Tarifa energia (R$/kWh)">
              <CurrencyInput value={String(kwhRate)} onChange={(v) => setKwhRate(v === "" ? 0 : Number(v))} />
            </MiniField>
            <MiniField label="Mão de obra (h)">
              <input
                type="number"
                step="0.1"
                min={0}
                value={laborHours || ""}
                onChange={(e) => setLaborHours(Number(e.target.value))}
                className="glass-input w-full"
              />
            </MiniField>
            <MiniField label="Valor hora (R$)">
              <CurrencyInput value={String(hourlyRate)} onChange={(v) => setHourlyRate(v === "" ? 0 : Number(v))} />
            </MiniField>
            <MiniField label="Consumíveis extras (R$)">
              <CurrencyInput value={String(extras)} onChange={(v) => setExtras(v === "" ? 0 : Number(v))} />
            </MiniField>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Toggle checked={paintedByHand} onChange={setPaintedByHand} label="Pintado à mão" />
            {paintedByHand && (
              <MiniField label="Custo de pintura (R$)" className="w-32">
                <CurrencyInput value={String(paintCost)} onChange={(v) => setPaintCost(v === "" ? 0 : Number(v))} />
              </MiniField>
            )}
          </div>
        </div>

        {/* Insumos */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Insumos Utilizados</h4>
            <NeonButton
              type="button"
              variant="outline"
              size="sm"
              onClick={addSupplyLine}
              disabled={supplies.length === 0}
              className="whitespace-nowrap"
            >
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
                    <MiniField label="Insumo">
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
                    </MiniField>
                  </div>
                  <div className="w-28">
                    <MiniField label={`Qtd (${supply?.unit ?? "un"})`}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.quantity || ""}
                        onChange={(e) => updateSupplyLine(line.id, { quantity: Number(e.target.value) })}
                        className="glass-input w-full"
                      />
                    </MiniField>
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
        </div>

        {/* Precificação */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Precificação</h4>
          <MarginSlider value={marginPercent} onChange={setMarginPercent} label="Margem de Lucro Desejada" />

          <MiniField label="Taxa de marketplace">
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
            </div>
          </MiniField>

          {riskTiers.length > 0 && (
            <MiniField label="Nível de risco (opcional)">
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
            </MiniField>
          )}
        </div>

        {/* Resumo */}
        <div className="glass-card space-y-2 p-4 text-sm">
          <SummaryRow label="Custo de Filamento" value={formatBRL(calc.filamentCost)} />
          <SummaryRow label="Custo de Energia" value={formatBRL(calc.energyCost)} />
          {suppliesCost > 0 && <SummaryRow label="Insumos" value={formatBRL(calc.suppliesCost)} />}
          <div className="my-1 h-px bg-border-glass" />
          <SummaryRow
            label={isLoteOnly ? "Custo Total da Mesa" : "Custo Total Unitário"}
            value={formatBRL(calc.costPerUnit)}
            strong
          />
          {(laborHours > 0 || extras > 0 || (paintedByHand && paintCost > 0)) && (
            <SummaryRow label="+ Fixos (mão de obra/pintura/extras)" value={formatBRL(calc.fixedCosts)} />
          )}
          <div className="my-1 h-px bg-border-glass" />
          {selectedRiskTier ? (
            <>
              <SummaryRow label="Preço com margem + taxa" value={formatBRL(calc.pricePerUnitBeforeRisk)} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-text-secondary">
                  Preço de Venda Sugerido (+{selectedRiskTier.extra_margin_percent}% risco)
                </span>
                <span className="neon-text font-numeric text-xl font-semibold">{formatBRL(calc.pricePerUnit)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-text-secondary">Preço de Venda Sugerido</span>
              <span className="neon-text font-numeric text-xl font-semibold">{formatBRL(calc.pricePerUnit)}</span>
            </div>
          )}
        </div>

        {noUnitBeds && (
          <p className="text-right text-[11px] text-amber-400">
            Adicione ao menos uma mesa Peça única/Montagem ou Lote — mesas Mix sozinhas não definem o custo do
            produto.
          </p>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="button" onClick={handleApply} disabled={noUnitBeds}>
            Aplicar ao Produto
          </NeonButton>
        </div>
      </div>
    </Modal>
  );
}

function MiniField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] text-text-muted">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-secondary">{label}</span>
      <span className={strong ? "font-numeric font-semibold text-text-primary" : "font-numeric text-text-primary"}>
        {value}
      </span>
    </div>
  );
}
