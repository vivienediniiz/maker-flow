"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import type { Filament } from "@/lib/types";

interface FilamentPickerDropdownProps {
  filaments: Filament[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

function filamentOptionLabel(f: Filament) {
  return `${f.material} — ${f.brand} (${formatBRL(f.price_per_kg)}/kg · ${f.remaining_weight_g}g disponíveis)`;
}

/**
 * Select nativo não renderiza HTML dentro de <option> (sem como mostrar a
 * bolinha de cor), então isso é um dropdown proprio via portal, seguindo o
 * mesmo padrao de NotificationsBell/Topbar (ref + getBoundingClientRect +
 * portal pro body) pra nao ficar preso pelo overflow do modal.
 */
export function FilamentPickerDropdown({ filaments, value, onChange, placeholder = "Selecione..." }: FilamentPickerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const selected = filaments.find((f) => f.id === value) ?? null;

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, [open]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass-input flex w-full items-center justify-between gap-2 text-left"
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-white/20"
              style={{ backgroundColor: selected.color_hex }}
            />
            <span className="truncate">{filamentOptionLabel(selected)}</span>
          </span>
        ) : (
          <span className="truncate text-text-muted">
            {filaments.length === 0 ? "Nenhum filamento cadastrado" : placeholder}
          </span>
        )}
        <ChevronDown size={14} className="shrink-0 text-text-muted" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
            <div
              className="glass-card fixed z-[9999] max-h-64 overflow-y-auto scrollbar-glass p-1 shadow-neon-glow"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {filaments.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-text-muted">Nenhum filamento cadastrado</p>
              ) : (
                filaments.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelect(f.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5",
                      f.id === value ? "text-text-primary" : "text-text-secondary"
                    )}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                      style={{ backgroundColor: f.color_hex }}
                    />
                    <span className="truncate">{filamentOptionLabel(f)}</span>
                  </button>
                ))
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
