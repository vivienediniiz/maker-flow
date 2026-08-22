"use client";

import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";

/**
 * Card recolhível usado nas listas mobile (abaixo de md) que substituem tabela:
 * cabeçalho sempre visível com a informação principal + ações, corpo com o
 * detalhamento (CardRow) só aparece expandido. Cada instância controla seu
 * próprio estado — várias podem ficar abertas ao mesmo tempo.
 */
export function CollapsibleCard({
  header,
  actions,
  children,
  defaultOpen = false,
  className,
}: {
  header: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard hover padding="md" className={cn("overflow-hidden", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-2"
      >
        <div className="min-w-0 flex-1">{header}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          {actions}
          <ChevronDown
            size={16}
            className={cn("ml-1 shrink-0 text-text-muted transition-transform", open && "rotate-180")}
          />
        </div>
      </div>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <div className="mt-3 divide-y divide-border-glass/60 border-t border-border-glass/60">{children}</div>
        </div>
      </div>
    </GlassCard>
  );
}
