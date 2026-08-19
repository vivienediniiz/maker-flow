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
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { calculateCost } from "@/lib/costCalculator";
import { Plus, Trash2, FileDown, Link2, Rocket, PackagePlus } from "lucide-react";
import type { Product, Supply, Filament } from "@/lib/types";

interface PrintBed {
  id: string;
  name: string;
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
  filamentId: string;
  /** "batch": mesa com várias peças vendidas juntas como um lote único (ex: colado direto do slicer). Peso/Tempo sempre representam o TOTAL da mesa — `itemsCount` é só referência informativa, não entra em nenhum cálculo. */
  mode: "single" | "batch";
  itemsCount: number;
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
    mode: "single",
    itemsCount: 2,
  };
}

function newSupplyLine(): SupplyLine {
  return { id: crypto.randomUUID(), supplyId: "", quantity: 0 };
}

export default function CalculatorPage() {
  const supabase = createClient();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
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
  const [quantity, setQuantity] = useState(1);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyLines, setSupplyLines] = useState<SupplyLine[]>([]);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    loadMarketplaces();
    loadSupplies();
    loadFilaments();
  }, []);

  async function loadProducts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("name");
    setProducts((data as Product[]) ?? []);
  }

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

  function handleSelectProduct(productId: string) {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setProjectName(product.name);

    const ci = product.calc_inputs;
    if (ci) {
      setBeds(
        ci.beds.map((b, i) =>
          // Mesa salva em modo Lote não auto-preenche — o peso/tempo lá é o
          // total daquela mesa cheia, não de uma unidade padrão do produto,
          // então volta em branco pra não confundir com o cálculo por peça.
          b.mode === "batch"
            ? newBed(i + 1)
            : {
                ...b,
                id: crypto.randomUUID(),
                filamentId: b.filamentId ?? "",
                mode: "single",
                itemsCount: 2,
              }
        )
      );
      setKwhRate(ci.kwhRate);
      setLaborHours(ci.laborHours);
      setHourlyRate(ci.hourlyRate);
      setExtras(ci.extras);
      setPaintedByHand(ci.paintedByHand);
      setPaintCost(ci.paintCost);
      setMarketplaceFee(ci.marketplaceFee);
      setMarginPercent(Math.min(Math.max(ci.marginPercent, 0), 99));
      setQuantity(ci.quantity);
    }
  }

  /** Produto criado direto do toggle "Cadastrar Produto" — só entra como referência/vínculo, não mexe no cálculo já feito na tela. */
  function handleNewProductCreated(product: Product) {
    setProducts((prev) => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
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
  // Peso/Tempo sempre entram como o TOTAL da mesa (mesmo em modo Lote, onde
  // o lote inteiro é vendido como um pedido único — sem dividir por
  // itemsCount, que é só referência informativa).
  const calcBeds = useMemo(
    () =>
      beds.map((b) => ({
        weightG: b.weightG,
        timeH: b.timeH,
        timeM: b.timeM,
        watts: b.watts,
        filamentPricePerKg: filaments.find((f) => f.id === b.filamentId)?.price_per_kg ?? 0,
      })),
    [beds, filaments]
  );

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
        quantity,
      }),
    [calcBeds, kwhRate, laborHours, hourlyRate, extras, paintedByHand, paintCost, suppliesCost, marketplaceFee, marginPercent, quantity]
  );

  const missingFilament = beds.some((b) => !b.filamentId);

  // Snapshot estável dos insumos selecionados aqui — só muda quando o usuário
  // de fato edita a lista, pra não resetar a seção "Insumo(s) Utilizados" da
  // Venda Manual enquanto ela estiver aberta por cima desta tela.
  const usedSuppliesForSale = useMemo(
    () =>
      supplyLines
        .filter((l) => l.supplyId)
        .map((l) => ({ supplyId: l.supplyId, quantity: l.quantity ? String(l.quantity) : "" })),
    [supplyLines]
  );

  // Mesmo raciocínio: o filamento de cada mesa já usado aqui é o mesmo que
  // deve ser descontado do estoque quando o pedido for confirmado.
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

      {/* Real-time cost preview header — sticky */}
      <div className="sticky top-[65px] z-20 border-b border-border-glass bg-bg/80 px-6 py-4 backdrop-blur-glass md:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <PreviewStat label="Energia" value={formatBRL(calc.energyCost)} />
          <PreviewStat label="Filamento" value={formatBRL(calc.filamentCost)} />
          <PreviewStat label="Extras" value={formatBRL(extras + calc.paint)} />
          <PreviewStat label="Custo Total" value={formatBRL(calc.baseCost)} />
          <PreviewStat label="Preço / Peça" value={formatBRL(calc.pricePerPiece)} highlight />
        </div>
      </div>

      <main className="grid grid-cols-1 gap-6 px-6 py-8 md:px-8 xl:grid-cols-[1fr_360px]">
        {/* Left column: inputs */}
        <div className="space-y-6">
          <GlassCard padding="lg" className="space-y-3">
            <label className="block text-xs text-text-muted">Nome do produto</label>

            <div className="glass-card flex gap-1 p-1">
              <button
                type="button"
                className="flex-1 rounded-pill bg-neon-gradient py-2 text-xs font-medium text-white"
              >
                Selecionar produto já cadastrado
              </button>
              <button
                type="button"
                onClick={() => setNewProductModalOpen(true)}
                className="flex-1 rounded-pill py-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Cadastrar Produto
              </button>
            </div>

            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="glass-input w-full text-base"
            >
              <option value="" className="bg-bg-raised">
                {products.length === 0 ? "Nenhum produto cadastrado ainda" : "Selecione..."}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-bg-raised">
                  {p.name} {!p.calc_inputs && "(sem dados de cálculo salvos)"}
                </option>
              ))}
            </select>
            {projectName && (
              <p className="text-[11px] text-text-muted">
                Produto selecionado: <span className="text-text-secondary">{projectName}</span>
              </p>
            )}
          </GlassCard>

          {/* Print beds */}
          <GlassCard padding="lg" className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
                Mesas de Impressão
              </h3>
              <NeonButton variant="outline" size="sm" onClick={addBed}>
                <Plus size={14} /> Adicionar mesa
              </NeonButton>
            </div>

            {beds.map((bed) => (
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

                <div className="glass-card flex gap-1 p-1">
                  <button
                    type="button"
                    onClick={() => updateBed(bed.id, { mode: "single" })}
                    className={cn(
                      "flex-1 rounded-pill py-1.5 text-[11px] font-medium transition-colors",
                      bed.mode === "single" ? "bg-neon-gradient text-white" : "text-text-secondary"
                    )}
                  >
                    Item Único
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBed(bed.id, { mode: "batch" })}
                    className={cn(
                      "flex-1 rounded-pill py-1.5 text-[11px] font-medium transition-colors",
                      bed.mode === "batch" ? "bg-neon-gradient text-white" : "text-text-secondary"
                    )}
                  >
                    Lote
                  </button>
                </div>

                {bed.mode === "batch" && (
                  <Field label="Quantidade de itens na mesa (referência)">
                    <input
                      type="number"
                      min={2}
                      value={bed.itemsCount || ""}
                      onChange={(e) => updateBed(bed.id, { itemsCount: Math.max(2, Number(e.target.value)) })}
                      className="glass-input w-full"
                    />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label={bed.mode === "batch" ? "Peso total (g)" : "Peso (g)"}>
                    <input
                      type="number"
                      min={0}
                      value={bed.weightG || ""}
                      onChange={(e) => updateBed(bed.id, { weightG: Number(e.target.value) })}
                      className="glass-input w-full"
                    />
                  </Field>
                  <Field label={bed.mode === "batch" ? "Tempo total (h)" : "Tempo (h)"}>
                    <input
                      type="number"
                      min={0}
                      value={bed.timeH || ""}
                      onChange={(e) => updateBed(bed.id, { timeH: Number(e.target.value) })}
                      className="glass-input w-full"
                    />
                  </Field>
                  <Field label={bed.mode === "batch" ? "Tempo total (min)" : "Tempo (min)"}>
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

                {bed.mode === "batch" && bed.itemsCount > 0 && (
                  <p className="text-[11px] text-neon-green">
                    ≈ {Math.round(bed.weightG / bed.itemsCount)}g e{" "}
                    {Math.round((bed.timeH * 60 + bed.timeM) / bed.itemsCount)}min por unidade
                  </p>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label="Filamento">
                      <FilamentPickerDropdown
                        filaments={filaments}
                        value={bed.filamentId}
                        onChange={(id) => updateBed(bed.id, { filamentId: id })}
                      />
                    </Field>
                  </div>
                  <NeonButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mb-0.5 shrink-0"
                    onClick={() => setFilamentModalBedId(bed.id)}
                  >
                    <Plus size={14} /> Cadastrar Filamento
                  </NeonButton>
                </div>
                {!bed.filamentId && (
                  <p className="text-[11px] text-amber-400">Selecione um filamento cadastrado pra calcular o custo desta mesa.</p>
                )}
              </div>
            ))}
          </GlassCard>

          {/* Costs & extras */}
          <GlassCard padding="lg" className="space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              Custos e Consumíveis
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Tarifa energia (R$/kWh)">
                <input type="number" step="0.01" value={kwhRate} onChange={(e) => setKwhRate(Number(e.target.value))} className="glass-input w-full" />
              </Field>
              <Field label="Mão de obra (h)">
                <input type="number" step="0.1" value={laborHours} onChange={(e) => setLaborHours(Number(e.target.value))} className="glass-input w-full" />
              </Field>
              <Field label="Valor hora (R$)">
                <input type="number" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} className="glass-input w-full" />
              </Field>
              <Field label="Consumíveis extras (R$)">
                <input type="number" value={extras} onChange={(e) => setExtras(Number(e.target.value))} className="glass-input w-full" />
              </Field>
              <Field label="Quantidade de peças">
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="glass-input w-full" />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-glass pt-4">
              <Toggle checked={paintedByHand} onChange={setPaintedByHand} label="Pintado à mão" />
              {paintedByHand && (
                <Field label="Custo de pintura (R$)">
                  <input type="number" value={paintCost} onChange={(e) => setPaintCost(Number(e.target.value))} className="glass-input w-32" />
                </Field>
              )}
            </div>
          </GlassCard>

          {/* Insumos */}
          <GlassCard padding="lg" className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Insumos Utilizados</h3>
              <NeonButton variant="outline" size="sm" onClick={addSupplyLine} disabled={supplies.length === 0}>
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
                      <Field label={`Qtd. (${supply?.unit ?? "un"})`}>
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
              Só entra no orçamento — o estoque só é baixado quando o pedido for de fato confirmado.
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
                  value={marketplaceFee}
                  onChange={(e) => setMarketplaceFee(Number(e.target.value))}
                  className="glass-input w-full"
                  placeholder="Ajustar % manualmente"
                />
              </div>
            </Field>
          </GlassCard>

          {/* Cadastrar Produto — logo abaixo dos campos preenchidos, destacado */}
          <NeonButton size="lg" className="w-full" onClick={() => setProductModalOpen(true)} disabled={missingFilament}>
            <PackagePlus size={18} /> Cadastrar Produto
          </NeonButton>
          {missingFilament && (
            <p className="-mt-4 text-center text-[11px] text-amber-400">
              Selecione um filamento cadastrado em cada mesa pra liberar o cálculo.
            </p>
          )}
        </div>

        {/* Right column: summary + actions */}
        <div className="space-y-6">
          <GlassCard padding="lg" className="sticky top-[140px] space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Resumo</h3>
            <div className="space-y-2 text-sm">
              <SummaryRow label="Peso total" value={`${calc.totalWeightG.toFixed(0)} g`} />
              <SummaryRow label="Tempo total" value={`${calc.totalHours.toFixed(1)} h`} />
              <SummaryRow label="Filamento" value={formatBRL(calc.filamentCost)} />
              <SummaryRow label="Energia" value={formatBRL(calc.energyCost)} />
              <SummaryRow label="Mão de obra" value={formatBRL(calc.laborCost)} />
              {paintedByHand && <SummaryRow label="Pintura" value={formatBRL(calc.paint)} />}
              <SummaryRow label="Extras" value={formatBRL(extras)} />
              {suppliesCost > 0 && <SummaryRow label="Insumos" value={formatBRL(calc.suppliesCost)} />}
              <div className="my-2 h-px bg-border-glass" />
              <SummaryRow label="Custo total" value={formatBRL(calc.baseCost)} />
            </div>

            <div className="glass-card space-y-1 p-4 text-center">
              <p className="text-xs text-text-muted">Preço final sugerido</p>
              <p className="neon-text font-numeric text-3xl font-semibold">{formatBRL(calc.finalPrice)}</p>
              {quantity > 1 && (
                <p className="font-numeric text-xs text-text-muted">{formatBRL(calc.pricePerPiece)} / peça</p>
              )}
            </div>

            <div className="space-y-2">
              <NeonButton className="w-full" onClick={() => setOrderModalOpen(true)} disabled={missingFilament}>
                <Rocket size={16} /> Iniciar Projeto / Criar Pedido
              </NeonButton>
              <NeonButton variant="outline" className="w-full" onClick={() => setQuoteModalOpen(true)} disabled={missingFilament}>
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
          </GlassCard>
        </div>
      </main>

      <NewSaleModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        initialProjectName={projectName}
        initialFinalPrice={calc.finalPrice}
        weightG={calc.totalWeightG}
        printTimeMin={calc.totalHours * 60}
        energyCost={calc.energyCost}
        filamentCost={calc.filamentCost}
        marginPercent={marginPercent}
        initialUsedFilaments={usedFilamentsForSale}
        initialUsedSupplies={usedSuppliesForSale}
      />
      <NewProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onCreated={(p) => setProducts((prev) => [...prev, p])}
        initialName={projectName}
        initialCostPrice={calc.baseCost}
        initialSalePrice={calc.pricePerPiece}
        calcInputs={{
          beds: beds.map(({ name, weightG, timeH, timeM, watts, filamentId, mode, itemsCount }) => ({
            name,
            weightG,
            timeH,
            timeM,
            watts,
            filamentId,
            mode,
            itemsCount,
          })),
          kwhRate,
          laborHours,
          hourlyRate,
          extras,
          paintedByHand,
          paintCost,
          marketplaceFee,
          marginPercent,
          quantity,
        }}
      />
      <NewProductModal
        open={newProductModalOpen}
        onClose={() => setNewProductModalOpen(false)}
        onCreated={handleNewProductCreated}
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
          finalPrice: calc.finalPrice,
          pricePerPiece: calc.pricePerPiece,
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

function PreviewStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("glass-card px-3 py-2.5", highlight && "border-neon-pink/40 shadow-neon-glow")}>
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={cn("font-numeric text-sm font-semibold", highlight && "neon-text")}>{value}</p>
    </div>
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
