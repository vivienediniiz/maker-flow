"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calculator,
  Users,
  ClipboardList,
  Package,
  Boxes,
  Disc3,
  Truck,
  LineChart,
  BarChart3,
  FolderCog,
  Plug,
  Store,
  CreditCard,
  Gift,
  Settings,
} from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";
import { useCycle } from "./FakeCursor";

/** Espelha o menu real de components/dashboard/Sidebar.tsx — reaproveitado aqui e dentro do DashboardMockup. */
export const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Calculadora", icon: Calculator },
  { label: "Clientes", icon: Users },
  { label: "Vendas", icon: ClipboardList },
  { label: "Produtos", icon: Package },
  { label: "Estoque 3D", icon: Boxes },
  { label: "Filamentos", icon: Disc3 },
  { label: "Frete", icon: Truck },
  { label: "Financeiro", icon: LineChart },
  { label: "Insights", icon: BarChart3 },
  { label: "Cadastros", icon: FolderCog },
  { label: "Integrações", icon: Plug },
  { label: "Minha Loja", icon: Store },
  { label: "Assinatura", icon: CreditCard },
  { label: "Afiliados", icon: Gift },
  { label: "Configurações", icon: Settings },
];

export function SidebarMockup() {
  const active = useCycle(SIDEBAR_ITEMS.length, 1400);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AppLogo iconClassName="h-6 w-6" textClassName="font-display text-sm" />

      <nav className="flex-1 space-y-0.5">
        {SIDEBAR_ITEMS.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-colors duration-300",
              i === active ? "bg-neon-gradient text-white shadow-neon-glow" : "text-text-secondary"
            )}
          >
            <item.icon size={13} />
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border-glass pt-3">
        <p className="truncate text-[11px] font-medium text-text-primary">Viviene</p>
        <p className="text-[10px] text-text-muted">Plano Trimestral</p>
        <p className="text-[10px] text-neon-pink">Conheça os planos</p>
      </div>
    </div>
  );
}
