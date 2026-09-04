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
  const [highlightedIdx, setHighlightedIdx] = useState(0);
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

  // ✅ A11y: Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIdx((prev) => (prev < filaments.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIdx((prev) => (prev > 0 ? prev - 1 : filaments.length - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (filaments.length > 0) {
          handleSelect(filaments[highlightedIdx].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className="glass-input flex w-full items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink"
        aria-haspopup="listbox"
        aria-expanded={open}
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
              role="listbox"
              aria-label="Filamentos disponíveis"
            >
              {filaments.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-text-muted">Nenhum filamento cadastrado</p>
              ) : (
                filaments.map((f, idx) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelect(f.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      idx === highlightedIdx ? "bg-white/10" : "hover:bg-white/5",
                      f.id === value ? "text-text-primary" : "text-text-secondary"
                    )}
                    role="option"
                    aria-selected={f.id === value}
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
