"use client";

import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";

export function GlassAccordion({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard padding="none" className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-text-primary">{title}</p>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
        <ChevronDown
          size={16}
          className={cn("text-text-muted transition-transform", open && "rotate-180 text-neon-pink")}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>
    </GlassCard>
  );
}
