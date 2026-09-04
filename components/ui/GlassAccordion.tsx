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

  // ✅ A11y: Keyboard support for Space/Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <GlassCard padding="none" className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between px-6 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neon-pink"
        aria-expanded={open}
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
