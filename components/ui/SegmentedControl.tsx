"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ✅ A11y: Keyboard navigation with arrow keys
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    } else {
      return;
    }

    onChange(options[nextIndex].value);
  };

  const currentIndex = options.findIndex((o) => o.value === value);

  return (
    <div className="glass-card inline-flex items-center gap-1 p-1" ref={containerRef} role="group" aria-label="Opções">
      {options.map((opt, idx) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className={cn(
            "flex min-h-[44px] items-center justify-center rounded-pill px-4 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink sm:min-h-0",
            value === opt.value
              ? "bg-neon-gradient text-white shadow-neon-glow"
              : "text-text-secondary hover:text-text-primary"
          )}
          aria-pressed={value === opt.value}
          tabIndex={idx === currentIndex ? 0 : -1}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
