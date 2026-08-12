"use client";

import { useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { PrintersRegistrationTab } from "@/components/dashboard/PrintersRegistrationTab";
import { FilamentsRegistrationTab } from "@/components/dashboard/FilamentsRegistrationTab";
import { SuppliesRegistrationTab } from "@/components/dashboard/SuppliesRegistrationTab";
import { ExtraPurchasesRegistrationTab } from "@/components/dashboard/ExtraPurchasesRegistrationTab";
import { BranchesRegistrationTab } from "@/components/dashboard/BranchesRegistrationTab";
import { CategoriesRegistrationTab } from "@/components/dashboard/CategoriesRegistrationTab";
import { cn } from "@/lib/utils";

const TABS = ["Impressoras", "Filamentos", "Insumos", "Compras Extras", "Filiais", "Categorias"] as const;

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

        {tab === "Impressoras" && <PrintersRegistrationTab />}
        {tab === "Filamentos" && <FilamentsRegistrationTab />}
        {tab === "Insumos" && <SuppliesRegistrationTab />}
        {tab === "Compras Extras" && <ExtraPurchasesRegistrationTab />}
        {tab === "Filiais" && <BranchesRegistrationTab />}
        {tab === "Categorias" && <CategoriesRegistrationTab />}
      </main>
    </>
  );
}
