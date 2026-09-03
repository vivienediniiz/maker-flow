"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botão de confirmar em vermelho (ação destrutiva) — true por padrão, já que praticamente todo uso aqui é exclusão. */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn>(async () => false);

/**
 * Substitui o `confirm()` nativo do navegador (popup genérico, sem
 * identidade visual) por um modal no estilo do app. Uso: `const confirm =
 * useConfirm(); if (!(await confirm("Excluir X?"))) return;` — mesmo padrão
 * de chamada do `confirm()` nativo, só que assíncrono e com Promise<boolean>.
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirmAction = useCallback<ConfirmFn>((options) => {
    const normalized: ConfirmOptions = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending(normalized);
    });
  }, []);

  function handleResolve(result: boolean) {
    setPending(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }

  return (
    <ConfirmDialogContext.Provider value={confirmAction}>
      {children}
      <Modal
        open={!!pending}
        onClose={() => handleResolve(false)}
        title={pending?.title ?? "Confirmar ação"}
        maxWidthClass="max-w-sm"
        zIndexClass="z-[100]"
      >
        {pending && (
          <div className="space-y-5">
            <p className="whitespace-pre-line text-sm text-text-secondary">{pending.message}</p>
            <div className="flex justify-end gap-3">
              <NeonButton type="button" variant="ghost" onClick={() => handleResolve(false)}>
                {pending.cancelLabel ?? "Cancelar"}
              </NeonButton>
              <NeonButton
                type="button"
                variant={pending.danger === false ? "primary" : "danger"}
                onClick={() => handleResolve(true)}
              >
                {pending.confirmLabel ?? "Confirmar"}
              </NeonButton>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmDialogContext);
}
