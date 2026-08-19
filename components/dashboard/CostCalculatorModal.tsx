"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { MarginSlider } from "@/components/ui/MarginSlider";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { calculateCost, type CalcBed } from "@/lib/costCalculator";
import type { CalcInputs, Filament } from "@/lib/types";

interface Bed extends CalcBed {
  id: string;
  name: string;
}

function newBed(index: number): Bed {
  return { id: crypto.randomUUID(), name: `Mesa ${index}`, weightG: 0, timeH: 0, timeM: 0, watts: 200 };
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
  const [selectedFilamentId, setSelectedFilamentId] = useState("");
  const [kwhRate, setKwhRate] = useState(0.95);
  const [marginPercent, setMarginPercent] = useState(50);
  const [filaments, setFilaments] = useState<Filament[]>([]);

  useEffect(() => {
    if (!open) return;
    setBeds([newBed(1)]);
    setSelectedFilamentId("");
    setMarginPercent(50);
    loadReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadReferenceData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: settings }, { data: filamentsData }] = await Promise.all([
      supabase.from("settings").select("electricity_kwh_rate").eq("user_id", user.id).single(),
      supabase.from("filaments").select("*").eq("user_id", user.id).order("brand"),
    ]);

    if (settings?.electricity_kwh_rate) setKwhRate(Number(settings.electricity_kwh_rate));
    setFilaments((filamentsData as Filament[]) ?? []);
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

  function handleSelectFilament(filamentId: string) {
    setSelectedFilamentId(filamentId);
    const f = filaments.find((f) => f.id === filamentId);
    if (f) setFilamentPricePerKg(f.price_per_kg);
  }

  const calc = useMemo(
    () =>
      calculateCost({
        beds,
        filamentPricePerKg,
        kwhRate,
        laborHours: 0,
        hourlyRate: 0,
        extras: 0,
        paintedByHand: false,
        paintCost: 0,
        marketplaceFee: 0,
        marginPercent,
        quantity: 1,
      }),
    [beds, filamentPricePerKg, kwhRate, marginPercent]
  );

  function handleApply() {
    const calcInputs: CalcInputs = {
      beds: beds.map(({ name, weightG, timeH, timeM, watts }) => ({
        name,
        weightG,
        timeH,
        timeM,
        watts,
        filamentId: selectedFilamentId || undefined,
        mode: "single",
        itemsCount: 2,
      })),
      filamentPricePerKg,
      kwhRate,
      laborHours: 0,
      hourlyRate: 0,
      extras: 0,
      paintedByHand: false,
      paintCost: 0,
      marketplaceFee: 0,
      marginPercent,
      quantity: 1,
    };
    onApply(calc.baseCost, calc.finalPrice, calcInputs);
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
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Mesas de Impressão</h4>
            <NeonButton type="button" variant="outline" size="sm" onClick={addBed}>
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
                    type="button"
                    onClick={() => removeBed(bed.id)}
                    className="text-text-muted hover:text-red-400"
                    aria-label="Remover mesa"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniField label="Peso (g)">
                  <input
                    type="number"
                    min={0}
                    value={bed.weightG || ""}
                    onChange={(e) => updateBed(bed.id, { weightG: Number(e.target.value) })}
                    className="glass-input w-full"
                  />
                </MiniField>
                <MiniField label="Tempo (h)">
                  <input
                    type="number"
                    min={0}
                    value={bed.timeH || ""}
                    onChange={(e) => updateBed(bed.id, { timeH: Number(e.target.value) })}
                    className="glass-input w-full"
                  />
                </MiniField>
                <MiniField label="Tempo (min)">
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
            </div>
          ))}
        </div>

        {/* Filamento e energia */}
        <div className="grid grid-cols-2 gap-3">
          <MiniField label="Filamento (R$/kg)">
            <input
              type="number"
              value={filamentPricePerKg}
              onChange={(e) => {
                setSelectedFilamentId("");
                setFilamentPricePerKg(Number(e.target.value));
              }}
              className="glass-input w-full"
            />
          </MiniField>
          <MiniField label="Tarifa energia (R$/kWh)">
            <input
              type="number"
              step="0.01"
              value={kwhRate}
              onChange={(e) => setKwhRate(Number(e.target.value))}
              className="glass-input w-full"
            />
          </MiniField>
        </div>
        {filaments.length > 0 && (
          <MiniField label="Usar preço de um filamento cadastrado (opcional)">
            <select
              value={selectedFilamentId}
              onChange={(e) => handleSelectFilament(e.target.value)}
              className="glass-input w-full"
            >
              <option value="" className="bg-bg-raised">
                Selecione...
              </option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id} className="bg-bg-raised">
                  {f.material} — {f.brand} ({formatBRL(f.price_per_kg)}/kg)
                </option>
              ))}
            </select>
          </MiniField>
        )}

        {/* Margem */}
        <MarginSlider value={marginPercent} onChange={setMarginPercent} label="Margem de Lucro Desejada" />

        {/* Resumo */}
        <div className="glass-card space-y-2 p-4 text-sm">
          <SummaryRow label="Custo de Filamento" value={formatBRL(calc.filamentCost)} />
          <SummaryRow label="Custo de Energia" value={formatBRL(calc.energyCost)} />
          <div className="my-1 h-px bg-border-glass" />
          <SummaryRow label="Custo Total Unitário" value={formatBRL(calc.baseCost)} strong />
          <div className="my-1 h-px bg-border-glass" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-text-secondary">Preço de Venda Sugerido</span>
            <span className="neon-text font-numeric text-xl font-semibold">{formatBRL(calc.finalPrice)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="button" onClick={handleApply}>
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
