"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/dashboard/Topbar";
import { PrintersRegistrationTab } from "@/components/dashboard/PrintersRegistrationTab";
import { SuppliesRegistrationTab } from "@/components/dashboard/SuppliesRegistrationTab";
import { ExtraPurchasesRegistrationTab } from "@/components/dashboard/ExtraPurchasesRegistrationTab";
import { BranchesRegistrationTab } from "@/components/dashboard/BranchesRegistrationTab";
import { CategoriesRegistrationTab } from "@/components/dashboard/CategoriesRegistrationTab";
import { CouponsRegistrationTab } from "@/components/dashboard/CouponsRegistrationTab";
import { UpgradeGate } from "@/components/dashboard/UpgradeGate";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { cn } from "@/lib/utils";

const TABS = ["Impressoras", "Insumos", "Compras Extras", "Cupons", "Filiais", "Categorias"] as const;

export default function RegistrationsPage() {
  const { paid } = useSubscription();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Impressoras");

  // Deep link (ex: checklist de onboarding em ?tab=Insumos) — só troca a aba
  // se o valor bater com uma das existentes, senão mantém "Impressoras".
  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested && (TABS as readonly string[]).includes(requested)) {
      setTab(requested as (typeof TABS)[number]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                "flex min-h-[44px] shrink-0 items-center justify-center rounded-pill px-4 py-2 text-xs font-medium transition-colors sm:min-h-0",
                tab === t ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Impressoras" && <PrintersRegistrationTab />}
        {tab === "Insumos" &&
          (paid ? (
            <SuppliesRegistrationTab />
          ) : (
            <UpgradeGate
              title="Insumos é recurso pago"
              description="Cadastre parafusos, embalagens e outros insumos do seu estúdio — disponível nos planos Starter e Pro."
            />
          ))}
        {tab === "Compras Extras" &&
          (paid ? (
            <ExtraPurchasesRegistrationTab />
          ) : (
            <UpgradeGate
              title="Compras Extras é recurso pago"
              description="Registre despesas avulsas (manutenção, ferramentas, etc.) — disponível nos planos Starter e Pro."
            />
          ))}
        {tab === "Cupons" &&
          (paid ? (
            <CouponsRegistrationTab />
          ) : (
            <UpgradeGate
              title="Cupons é recurso pago"
              description="Crie cupons de desconto e aplique nas vendas manuais — disponível nos planos Starter e Pro."
            />
          ))}
        {tab === "Filiais" && <BranchesRegistrationTab />}
        {tab === "Categorias" && <CategoriesRegistrationTab />}
      </main>
    </>
  );
}
