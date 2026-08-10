"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { QuickSaleModal } from "@/components/dashboard/QuickSaleModal";
import { formatBRL } from "@/lib/utils";
import { MapPin, Minus, Plus, ShoppingBag } from "lucide-react";

interface StockItem {
  id: string;
  name: string;
  location: string;
  price: number;
  quantity: number;
}

const initialStock: StockItem[] = [
  { id: "1", name: "Vaso Geométrico Torcido", location: "Gaveta A2", price: 42, quantity: 12 },
  { id: "2", name: "Suporte de Headset RGB", location: "Prateleira 3", price: 69, quantity: 5 },
  { id: "3", name: "Miniatura Dragão Articulado", location: "Gaveta B1", price: 129, quantity: 3 },
  { id: "4", name: "Organizador de Mesa Modular", location: "Prateleira 1", price: 58, quantity: 20 },
];

const SALES_HISTORY = [
  { id: "1", name: "Suporte de Headset RGB", date: "05/08/2026", qty: 2, total: 138 },
  { id: "2", name: "Vaso Geométrico Torcido", date: "03/08/2026", qty: 1, total: 42 },
  { id: "3", name: "Organizador de Mesa Modular", date: "01/08/2026", qty: 4, total: 232 },
];

export default function InventoryPage() {
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [items, setItems] = useState(initialStock);
  const [saleTarget, setSaleTarget] = useState<StockItem | null>(null);

  function bump(id: string, delta: number) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
    );
  }

  return (
    <>
      <Topbar title="Estoque 3D & Vendas" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "stock", label: "Produtos em Estoque" },
            { value: "history", label: "Histórico de Vendas" },
          ]}
        />

        {tab === "stock" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <GlassCard key={item.id} hover padding="md" className="space-y-3">
                <div className="flex h-24 items-center justify-center rounded-xl bg-neon-gradient-soft text-2xl">
                  📦
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.name}</p>
                  <p className="flex items-center gap-1 text-xs text-text-muted">
                    <MapPin size={11} /> {item.location}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-numeric text-sm font-semibold text-neon-pink">{formatBRL(item.price)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => bump(item.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => bump(item.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-white/10"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSaleTarget(item)}
                  className="neon-btn w-full py-2 text-xs"
                  disabled={item.quantity === 0}
                >
                  <ShoppingBag size={13} /> Registrar venda
                </button>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Qtd.</th>
                  <th className="px-6 py-4 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {SALES_HISTORY.map((s) => (
                  <tr key={s.id} className="border-b border-border-glass/60">
                    <td className="px-6 py-4 text-text-primary">{s.name}</td>
                    <td className="px-6 py-4 text-text-secondary">{s.date}</td>
                    <td className="px-6 py-4 text-text-secondary">{s.qty}</td>
                    <td className="px-6 py-4 text-right font-numeric font-medium text-text-primary">{formatBRL(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        )}
      </main>

      {saleTarget && (
        <QuickSaleModal
          open={!!saleTarget}
          onClose={() => setSaleTarget(null)}
          itemName={saleTarget.name}
          unitPrice={saleTarget.price}
          maxQuantity={saleTarget.quantity}
          onConfirm={({ quantity }) => bump(saleTarget.id, -quantity)}
        />
      )}
    </>
  );
}
