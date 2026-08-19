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
import { formatBRL } from "@/lib/utils";
import { calculateCost } from "@/lib/costCalculator";
import { Plus, Trash2, FileDown, Link2, Rocket } from "lucide-react";
import type { Product, Supply, Filament } from "@/lib/types";

interface PrintBed {
  id: string;
  name: string;
  /** Peso/tempo TOTAIS da mesa cheia, direto do fatiador — a soma de todas as mesas é o custo de 1 unidade completa do produto. */
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
  filamentId: string;
  /** Só informativo (dica visual "≈ Xg por peça") — nunca entra em nenhum cálculo. */
  piecesInBed: number;
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
    piecesInBed: 1,
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
  /** Quantidade de Produtos Finais do pedido — multiplica custo/preço por unidade, nunca os fixos (mão de obra/pintura/extras). */
  const [quantity, setQuantity] = useState(1);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [supplyLines, setSupplyLines] = useState<SupplyLine[]>([]);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
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

    // Não recarrega "Quantidade de Produtos Finais" — isso é uma decisão de
    // pedido (quantas unidades quero agora), não uma propriedade da receita
    // do produto, então o que já estiver na tela permanece.
    const ci = product.calc_inputs;
    if (ci) {
      setBeds(
        ci.beds.map((b) => ({
          id: crypto.randomUUID(),
          name: b.name,
          weightG: b.weightG,
          timeH: b.timeH,
          timeM: b.timeM,
          watts: b.watts,
          filamentId: b.filamentId ?? "",
          piecesInBed: b.piecesInBed ?? 1,
        }))
      );
      setKwhRate(ci.kwhRate);
      setLaborHours(ci.laborHours);
      setHourlyRate(ci.hourlyRate);
      setExtras(ci.extras);
      setPaintedByHand(ci.paintedByHand);
      setPaintCost(ci.paintCost);
      setMarketplaceFee(ci.marketplaceFee);
      setMarginPercent(Math.min(Math.max(ci.marginPercent, 0), 99));
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
            <p className="-mt-3 text-[11px] text-text-muted">
              Peso e tempo são sempre da mesa cheia, direto do fatiador — a soma de todas as mesas é o custo de
              produzir 1 unidade completa do produto.
            </p>

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

                <Field label="Quantas peças estão nesta mesa? (opcional, só referência)">
                  <input
                    type="number"
                    min={1}
                    value={bed.piecesInBed || ""}
                    onChange={(e) => updateBed(bed.id, { piecesInBed: Math.max(1, Number(e.target.value)) })}
                    className="glass-input w-full sm:w-32"
                  />
                </Field>
                {bed.piecesInBed > 1 && (
                  <p className="text-[11px] text-neon-green">
                    ≈ {Math.round(bed.weightG / bed.piecesInBed)}g e{" "}
                    {Math.round((bed.timeH * 60 + bed.timeM) / bed.piecesInBed)}min por peça nesta mesa
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
            <p className="-mt-3 text-[11px] text-text-muted">
              Fixos por pedido — não multiplicam pela Quantidade de Produtos Finais.
            </p>
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
                  value={marketplaceFee}
                  onChange={(e) => setMarketplaceFee(Number(e.target.value))}
                  className="glass-input w-full"
                  placeholder="Ajustar % manualmente"
                />
              </div>
            </Field>
          </GlassCard>

        </div>

        {/* Right column: summary + actions */}
        <div className="space-y-6">
          <GlassCard padding="lg" className="sticky top-[80px] space-y-5">
            <h3 className="neon-text text-sm font-medium uppercase tracking-wider">Resumo</h3>

            <Field label="Quantidade de Produtos Finais">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
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
              <div className="my-2 h-px bg-border-glass" />
              <SummaryRow label="Custo por Unidade" value={formatBRL(calc.costPerUnit)} />
              <SummaryRow label="Preço de Venda Sugerido" value={formatBRL(calc.pricePerUnit)} />
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
