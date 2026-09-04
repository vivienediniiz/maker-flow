"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
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
  const modalRef = useRef<HTMLDivElement>(null);
  // Deslocamento (arraste) do painel a partir da posição centralizada padrão
  // — reseta toda vez que o modal reabre.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    if (open) setOffset({ x: 0, y: 0 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    openModalStack.push(instanceId);

    // ✅ Focus trap: Auto-focus first focusable element
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    firstFocusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Só o modal do topo da pilha (o último aberto) responde ao Esc.
      if (openModalStack[openModalStack.length - 1] === instanceId) onClose();

      // ✅ Focus trap: Tab navigation
      if (e.key === "Tab") {
        const focusables = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        if (!focusables?.length) return;

        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // Shift+Tab no primeiro → vai pro último
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab no último → vai pro primeiro
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const idx = openModalStack.indexOf(instanceId);
      if (idx !== -1) openModalStack.splice(idx, 1);
    };
  }, [open, onClose, instanceId]);

  function handleDragStart(e: React.PointerEvent<HTMLDivElement>) {
    dragOrigin.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setOffset({
      x: dragOrigin.current.offsetX + (e.clientX - dragOrigin.current.x),
      y: dragOrigin.current.offsetY + (e.clientY - dragOrigin.current.y),
    });
  }

  function handleDragEnd() {
    setDragging(false);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 flex items-center justify-center px-4 py-8", zIndexClass)}>
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "glass-card relative flex max-h-[85vh] w-full flex-col p-5 shadow-neon-glow sm:p-6",
          maxWidthClass,
          dragging && "select-none"
        )}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div
          className="mb-4 flex shrink-0 cursor-move touch-none items-center justify-between gap-3 sm:mb-5"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <h3 id="modal-title" className="font-display text-lg">{title}</h3>
          <button
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-white/5 hover:text-text-primary sm:h-8 sm:w-8"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto scrollbar-glass">{children}</div>
      </div>
    </div>,
    document.body
  );
}
