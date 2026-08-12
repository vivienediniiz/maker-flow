"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { PrintersRegistrationTab } from "@/components/dashboard/PrintersRegistrationTab";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const TABS = [
  "Impressoras",
  "Filamentos",
  "Modelos 3D",
  "Compras Extras",
  "Marketplaces",
  "Filiais",
  "Categorias",
] as const;

const MOCK_ROWS: Record<Exclude<(typeof TABS)[number], "Impressoras">, { primary: string; secondary: string }[]> = {
  Filamentos: [
    { primary: "PLA Preto — Voolt3D", secondary: "R$89/kg · 820g restantes" },
    { primary: "PETG Rosa — 3DFila", secondary: "R$105/kg · 140g restantes" },
  ],
  "Modelos 3D": [
    { primary: "dragao_articulado_v2.stl", secondary: "42MB · Colecionável" },
    { primary: "suporte_monitor.stl", secondary: "8MB · Escritório" },
  ],
  "Compras Extras": [
    { primary: "Tinta acrílica set 12 cores", secondary: "R$68,00" },
    { primary: "Imãs de neodímio 6x2mm (50un)", secondary: "R$24,90" },
  ],
  Marketplaces: [
    { primary: "Elo7", secondary: "Taxa 12%" },
    { primary: "Shopee", secondary: "Taxa 14%" },
  ],
  Filiais: [{ primary: "Estúdio Principal", secondary: "Matriz" }],
  Categorias: [
    { primary: "Decoração", secondary: "8 produtos" },
    { primary: "Gamer", secondary: "5 produtos" },
  ],
};

export default function RegistrationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Impressoras");

  return (
    <>
      <Topbar title="Cadastros e Compras" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="glass-card flex gap-1 overflow-x-auto p-1 scrollbar-glass">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-pill px-4 py-2 text-xs font-medium transition-colors",
                tab === t ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Impressoras" ? (
          <PrintersRegistrationTab />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">{tab}</h3>
              <NeonButton size="sm">
                <Plus size={14} /> Novo em {tab}
              </NeonButton>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MOCK_ROWS[tab].map((row, i) => (
                <GlassCard key={i} hover padding="md">
                  <p className="text-sm font-medium text-text-primary">{row.primary}</p>
                  <p className="text-xs text-text-muted">{row.secondary}</p>
                </GlassCard>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}