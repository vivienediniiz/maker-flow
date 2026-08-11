"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { planDisplayLabel } from "@/lib/plans";
import type { SubscriptionTier, BillingCycle } from "@/lib/types";
import {
  LayoutDashboard,
  Calculator,
  ClipboardList,
  Package,
  Boxes,
  Truck,
  BarChart3,
  Settings,
  FolderCog,
  Zap,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/calculator", label: "Calculadora", icon: Calculator },
  { href: "/dashboard/orders", label: "Pedidos", icon: ClipboardList },
  { href: "/dashboard/products", label: "Produtos", icon: Package },
  { href: "/dashboard/inventory", label: "Estoque 3D", icon: Boxes },
  { href: "/dashboard/shipping", label: "Frete", icon: Truck },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart3 },
  { href: "/dashboard/registrations", label: "Cadastros", icon: FolderCog },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  studioName?: string;
  avatarUrl?: string | null;
  tier: SubscriptionTier;
  cycle: BillingCycle | null;
}

export function Sidebar({ studioName, avatarUrl, tier, cycle }: SidebarProps) {
  const pathname = usePathname();
  const planLabel = planDisplayLabel(tier, cycle);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-glass bg-bg-raised/60 backdrop-blur-glass md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-gradient shadow-neon-glow">
          <Zap size={18} className="text-white" />
        </div>
        <span className="font-display text-lg tracking-wide">MakerFlow</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-glass px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-white/[0.06] text-text-primary"
                  : "text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-neon-gradient text-white" : "bg-white/5 text-text-secondary group-hover:text-text-primary"
                )}
              >
                <Icon size={14} />
              </span>
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-pink shadow-neon-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border-glass p-4">
        <Link
          href="/pricing"
          className="glass-card block space-y-2.5 px-3 py-3 transition-colors hover:border-neon-pink/40 hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-neon-gradient">
              {avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-text-primary">{studioName || "Meu estúdio"}</p>
              <p className="truncate text-[10px] text-text-muted">{planLabel}</p>
            </div>
          </div>
          <p className="text-center text-[11px] font-semibold text-neon-pink">
            {tier === "free" ? "Assine agora →" : "Conheça os planos →"}
          </p>
        </Link>
      </div>
    </aside>
  );
}