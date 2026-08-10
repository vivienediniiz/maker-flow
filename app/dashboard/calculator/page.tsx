"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { NewOrderModal } from "@/components/dashboard/NewOrderModal";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { formatBRL, cn } from "@/lib/utils";
import { Plus, Trash2, FileDown, Link2, Rocket, UserPlus } from "lucide-react";

interface PrintBed {
  id: string;
  name: string;
  weightG: number;
  timeH: number;
  timeM: number;
  watts: number;
}

function newBed(index: number): PrintBed {
  return { id: crypto.randomUUID(), name: `Mesa ${index}`, weightG: 0, timeH: 0, timeM: 0, watts: 200 };
}

export default function CalculatorPage() {
  const [projectName, setProjectName] = useState("");
  const [beds, setBeds] = useState<PrintBed[]>([newBed(1)]);
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(120);
  const [kwhRate, setKwhRate] = useState(0.95);
  const [laborHours, setLaborHours] = useState(0.5);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [extras, setExtras] = useState(0);
  const [paintedByHand, setPaintedByHand] = useState(false);
  const [paintCost, setPaintCost] = useState(35);
  const [marketplaceFee, setMarketplaceFee] = useState(16);
  const [marginPercent, setMarginPercent] = useState(180);
  const [quantity, setQuantity] = useState(1);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  function addBed() {
    setBeds((b) => [...b, newBed(b.length + 1)]);
  }
  function removeBed(id: string) {
    setBeds((b) => (b.length > 1 ? b.filter((bed) => bed.id !== id) : b));
  }
  function updateBed(id: string, patch: Partial<PrintBed>) {
    setBeds((b) => b.map((bed) => (bed.id === id ? { ...bed, ...patch } : bed)));
  }

  const calc = useMemo(() => {
    const totalWeightG = beds.reduce((sum, b) => sum + (b.weightG || 0), 0);
    const totalHours = beds.reduce((sum, b) => sum + (b.timeH || 0) + (b.timeM || 0) / 60, 0);
    const energyCost = beds.reduce((sum, b) => {
      const hours = (b.timeH || 0) + (b.timeM || 0) / 60;
      return sum + (b.watts / 1000) * hours * kwhRate;
    }, 0);
    const filamentCost = (totalWeightG / 1000) * filamentPricePerKg;
    const laborCost = laborHours * hourlyRate;
    const paint = paintedByHand ? paintCost : 0;

    const baseCost = filamentCost + energyCost + laborCost + extras + paint;
    const priceWithMargin = baseCost * (1 + marginPercent / 100);
    const finalPrice = marketplaceFee > 0 ? priceWithMargin / (1 - marketplaceFee / 100) : priceWithMargin;
    const pricePerPiece = finalPrice / Math.max(quantity, 1);

    return {
      totalWeightG,
      totalHours,
      energyCost,
      filamentCost,
      laborCost,
      paint,
      baseCost,
      finalPrice,
      pricePerPiece,
    };
  }, [beds, filamentPricePerKg, kwhRate, laborHours, hourlyRate, extras, paintedByHand, paintCost, marketplaceFee, marginPercent, quantity]);

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
          <GlassCard padding="lg">
            <label className="mb-1.5 block text-xs text-text-muted">Nome do projeto</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Miniatura Dragão Articulado"
              className="glass-input w-full text-base"
            />
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

            {beds.map((bed, i) => (
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
              </div>
            ))}
          </GlassCard>

          {/* Costs & extras */}
          <GlassCard padding="lg" className="space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              Custos e Consumíveis
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Filamento (R$/kg)">
                <input type="number" value={filamentPricePerKg} onChange={(e) => setFilamentPricePerKg(Number(e.target.value))} className="glass-input w-full" />
              </Field>
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

          {/* Pricing */}
          <GlassCard padding="lg" className="space-y-5">
            <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">
              Precificação
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Margem de lucro (%)">
                <input type="number" value={marginPercent} onChange={(e) => setMarginPercent(Number(e.target.value))} className="glass-input w-full" />
              </Field>
              <Field label="Taxa de marketplace (%)">
                <input type="number" value={marketplaceFee} onChange={(e) => setMarketplaceFee(Number(e.target.value))} className="glass-input w-full" />
              </Field>
            </div>
          </GlassCard>
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
              <NeonButton className="w-full" onClick={() => setOrderModalOpen(true)}>
                <Rocket size={16} /> Iniciar Projeto / Criar Pedido
              </NeonButton>
              <NeonButton variant="outline" className="w-full">
                <FileDown size={16} /> Gerar PDF de Orçamento
              </NeonButton>
              <NeonButton variant="outline" className="w-full">
                <Link2 size={16} /> Gerar Link de Cobrança
              </NeonButton>
              <NeonButton variant="ghost" className="w-full" onClick={() => setClientModalOpen(true)}>
                <UserPlus size={16} /> Cadastrar novo cliente
              </NeonButton>
            </div>
          </GlassCard>
        </div>
      </main>

      <NewOrderModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        projectName={projectName}
        finalPrice={calc.finalPrice}
      />
      <NewClientModal open={clientModalOpen} onClose={() => setClientModalOpen(false)} />
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
