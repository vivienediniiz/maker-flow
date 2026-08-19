"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL } from "@/lib/utils";
import type { PlanId } from "@/lib/plans";

interface PixCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  planId: PlanId;
  planName: string;
  amount: number;
  onApproved: () => void;
}

type Step = "loading" | "ready" | "error" | "approved";

export function PixCheckoutModal({
  open,
  onClose,
  planId,
  planName,
  amount,
  onApproved,
}: PixCheckoutModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;

    setStep("loading");
    setError("");
    setCopied(false);

    (async () => {
      try {
        const res = await fetch("/api/mercadopago/create-pix-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Não foi possível gerar o Pix.");
          setStep("error");
          return;
        }

        setQrCode(data.qrCode);
        setQrCodeBase64(data.qrCodeBase64);
        setPaymentId(data.paymentId);
        setStep("ready");
      } catch {
        setError("Erro de rede ao gerar o Pix.");
        setStep("error");
      }
    })();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, planId]);

  useEffect(() => {
    if (step !== "ready" || !paymentId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercadopago/check-pix-status?paymentId=${paymentId}`);
        const data = await res.json();
        if (data.status === "approved") {
          setStep("approved");
          if (pollRef.current) clearInterval(pollRef.current);
          onApproved();
        }
      } catch {
        // silencioso — tenta de novo no próximo tick
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, paymentId, onApproved]);

  function copyCode() {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Pagar ${planName} com Pix`}>
      {step === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={28} className="animate-spin text-neon-pink" />
          <p className="text-sm text-text-secondary">Gerando QR code...</p>
        </div>
      )}

      {step === "error" && (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <NeonButton variant="outline" onClick={onClose}>
            Fechar
          </NeonButton>
        </div>
      )}

      {step === "approved" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-green/15 text-neon-green">
            <Check size={28} />
          </div>
          <p className="font-display text-lg">Pagamento aprovado!</p>
          <p className="text-sm text-text-secondary">Seu plano {planName} já está ativo.</p>
        </div>
      )}

      {step === "ready" && (
        <div className="space-y-4">
          <div className="glass-card flex items-center justify-between px-4 py-3">
            <span className="text-xs text-text-muted">Valor</span>
            <span className="font-numeric text-lg font-semibold text-neon-pink">{formatBRL(amount)}</span>
          </div>

          {qrCodeBase64 && (
            <div className="flex justify-center">
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR code Pix"
                className="h-48 w-48 rounded-xl border border-border-glass bg-white p-2"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Pix Copia e Cola</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={qrCode}
                className="glass-input w-full truncate text-base sm:text-xs"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copyCode}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border-glass bg-white/[0.03] px-3 text-xs text-text-secondary hover:text-text-primary"
              >
                {copied ? <Check size={13} className="text-neon-green" /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 size={13} className="animate-spin" />
            Aguardando confirmação do pagamento...
          </p>
        </div>
      )}
    </Modal>
  );
}