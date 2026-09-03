"use client";

import { useEffect, useRef, useState } from "react";
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
  // Enquanto o campo está focado, quem manda no texto exibido é o próprio
  // usuário digitando — não o valor vindo de fora. Sem isso, apagar o campo
  // (que normalmente dispara onChange("") e o pai converte pra 0) fazia o
  // "0,00" reaparecer sozinho no meio do apagar, obrigando a selecionar tudo
  // e sobrescrever em vez de só apagar e digitar de novo.
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
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
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        const cents = parseValueToCents(value);
        setDisplay(cents != null ? centsToDisplay(cents) : "");
      }}
      className={cn("glass-input w-full", className)}
      placeholder={placeholder}
    />
  );
}
