"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  /** Valor decimal em string (ex: "1234.5"), mesmo formato de Number()/parseFloat já usado nos formulários. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

function parseValueToCents(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function centsToDisplay(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
  id,
  required,
  disabled,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => {
    const cents = parseValueToCents(value);
    return cents != null ? centsToDisplay(cents) : "";
  });

  useEffect(() => {
    const cents = parseValueToCents(value);
    setDisplay(cents != null ? centsToDisplay(cents) : "");
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setDisplay("");
      onChange("");
      return;
    }
    const cents = Number(digits);
    setDisplay(centsToDisplay(cents));
    onChange((cents / 100).toFixed(2));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      required={required}
      disabled={disabled}
      value={display}
      onChange={handleChange}
      className={cn("glass-input w-full", className)}
      placeholder={placeholder}
    />
  );
}
