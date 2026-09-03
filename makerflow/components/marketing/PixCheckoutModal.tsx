"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import type { PlanTier, BillingCycle } from "@/lib/plans";

interface PixCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  tier: PlanTier;
  cycle: BillingCycle;
  planName: string;
  amount: number;
  onApproved?: () => void;
  /** Pra onde levar depois que o plano estiver liberado de verdade. */
  redirectTo?: string;
}

type Step = "loading" | "ready" | "error" | "approved";

export function PixCheckoutModal({
  open,
  onClose,
  tier,
  cycle,
  planName,
  amount,
  onApproved,
  redirectTo = "/dashboard",
}: PixCheckoutModalProps) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("loading");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onApprovedRef = useRef(onApproved);
  onApprovedRef.current = onApproved;

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
          body: JSON.stringify({ tier, cycle }),
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
  }, [open, tier, cycle]);

  useEffect(() => {
    if (step !== "ready" || !paymentId) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/mercadopago/check-pix-status?paymentId=${paymentId}`);
        const data = await res.json();
        if (data.status === "approved") {
          setStep("approved");
          if (pollRef.current) clearInterval(pollRef.current);
          onApprovedRef.current?.();
        }
      } catch {
        // silencioso — tenta de novo no próximo tick
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, paymentId]);

  // Pago != liberado: quem grava o plano no perfil é o webhook do Mercado
  // Pago, e a aba aberta não tem como ser avisada. Então espera o perfil
  // refletir a assinatura antes de navegar — senão o usuário cai no dashboard
  // ainda como Grátis segundos depois de pagar, que foi exatamente a queixa.
  // Navegação dura (não router.push) pra garantir render novo no servidor.
  useEffect(() => {
    if (step !== "approved") return;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      for (let attempt = 0; attempt < 12 && !cancelled; attempt++) {
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", user.id)
            .maybeSingle();
          if (data?.subscription_status === "active") break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Passou do limite sem o webhook chegar? Vai mesmo assim: o plano entra
      // sozinho quando o aviso chegar, e travar o usuário no modal é pior.
      if (!cancelled) window.location.assign(redirectTo);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, redirectTo]);

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
          <p className="text-sm text-text-secondary">Liberando o plano {planName}...</p>
          <Loader2 size={16} className="animate-spin text-text-muted" />
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