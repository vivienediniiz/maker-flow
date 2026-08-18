"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Pilha global dos modais abertos no momento — com vários Modal empilhados
// (ex: Nova Venda Manual -> Cadastrar Produto -> Calcular Custo Unitário),
// Esc precisa fechar só o de cima, não todos de uma vez.
const openModalStack: symbol[] = [];

export function Modal({
  open,
  onClose,
  title,
  children,
  zIndexClass = "z-50",
  maxWidthClass = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Classe de z-index do overlay — usada pra empilhar um modal secundário acima de outro já aberto. */
  zIndexClass?: string;
  /** Classe de largura máxima do painel. */
  maxWidthClass?: string;
}) {
  const instanceId = useRef(Symbol("modal")).current;

  useEffect(() => {
    if (!open) return;
    openModalStack.push(instanceId);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Só o modal do topo da pilha (o último aberto) responde ao Esc.
      if (openModalStack[openModalStack.length - 1] === instanceId) onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const idx = openModalStack.indexOf(instanceId);
      if (idx !== -1) openModalStack.splice(idx, 1);
    };
  }, [open, onClose, instanceId]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 flex items-center justify-center px-4", zIndexClass)}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className={cn("glass-card relative w-full p-6 shadow-neon-glow", maxWidthClass)}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-white/5 hover:text-text-primary"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
