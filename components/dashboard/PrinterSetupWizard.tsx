"use client";

import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, Download, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { BRIDGE_VERSION, getBridgeDownloadUrl } from "@/lib/bridgeRelease";
import { cn } from "@/lib/utils";
import type { Printer } from "@/lib/types";

interface PrinterSetupWizardProps {
  open: boolean;
  onClose: () => void;
  printer: Printer | null;
}

const TOTAL_STEPS = 4;
const TITLES = [
  "Ativar acesso local na impressora",
  "Baixar o programa MakerFlow Bridge",
  "Conectar o programa à sua impressora",
  "Confirmar conexão",
];

export function PrinterSetupWizard({ open, onClose, printer }: PrinterSetupWizardProps) {
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !printer) return;
    setStep(1);
    setConnected(!!printer.last_telemetry_at);
  }, [open, printer]);

  useEffect(() => {
    if (!open || step !== 4 || connected || !printer) return;

    let cancelled = false;
    async function checkConnection() {
      setChecking(true);
      const { data } = await supabase
        .from("printers")
        .select("last_telemetry_at")
        .eq("id", printer!.id)
        .single();
      if (!cancelled) {
        setChecking(false);
        if (data?.last_telemetry_at) setConnected(true);
      }
    }

    checkConnection();
    const interval = setInterval(checkConnection, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, step, connected, printer, supabase]);

  if (!printer) return null;

  function copyKey() {
    navigator.clipboard.writeText(printer!.api_key_webhook ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Passo ${step} de ${TOTAL_STEPS} — ${TITLES[step - 1]}`}>
      <div className="space-y-5">
        <StepDots step={step} total={TOTAL_STEPS} />

        {step === 1 && <Step1 />}
        {step === 2 && <Step2 />}
        {step === 3 && <Step3 apiKey={printer.api_key_webhook} onCopy={copyKey} copied={copied} />}
        {step === 4 && <Step4 connected={connected} checking={checking} />}

        <div className="flex items-center justify-between pt-2">
          <NeonButton
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Voltar
          </NeonButton>
          {step < TOTAL_STEPS ? (
            <NeonButton type="button" onClick={() => setStep((s) => s + 1)}>
              Próximo
            </NeonButton>
          ) : (
            <NeonButton type="button" onClick={onClose}>
              {connected ? "Concluir" : "Fechar"}
            </NeonButton>
          )}
        </div>
      </div>
    </Modal>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <span key={n} className={cn("h-1.5 flex-1 rounded-pill", n <= step ? "bg-neon-gradient" : "bg-white/10")} />
      ))}
    </div>
  );
}

function Step1() {
  return (
    <div className="space-y-3 text-sm text-text-secondary">
      <p>
        Na tela touch da sua impressora Bambu Lab, vá em{" "}
        <strong className="text-text-primary">Configurações → Rede</strong> e ative:
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong className="text-text-primary">Modo Somente LAN</strong> (LAN Only Mode)
        </li>
        <li>
          <strong className="text-text-primary">Modo Desenvolvedor</strong> (Developer Mode)
        </li>
      </ul>
      <p>Com isso ativado, anote 3 informações que aparecem na mesma tela:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong className="text-text-primary">IP</strong> da impressora
        </li>
        <li>
          <strong className="text-text-primary">Código de acesso</strong>
        </li>
        <li>
          <strong className="text-text-primary">Número de série</strong> — se não aparecer na tela, está numa
          etiqueta embaixo da impressora ou no cartão que veio na caixa.
        </li>
      </ul>
      <p className="text-xs text-text-muted">
        Sem o Modo Somente LAN + Modo Desenvolvedor ativados, a conexão local não funciona.
      </p>
    </div>
  );
}

function Step2() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Baixe o programa MakerFlow Bridge — ele roda no seu computador, na mesma rede Wi-Fi da impressora, e manda
        os dados dela pro MakerFlow automaticamente. Não precisa ter Python nem nada instalado.
      </p>
      <a href={getBridgeDownloadUrl()} download className="block">
        <NeonButton type="button" className="w-full justify-center">
          <Download size={16} /> Baixar Bridge (.exe)
        </NeonButton>
      </a>
      <p className="text-center text-xs text-text-muted">Versão atual: v{BRIDGE_VERSION} · Windows</p>
    </div>
  );
}

function Step3({ apiKey, onCopy, copied }: { apiKey: string | null; onCopy: () => void; copied: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Abra o programa que baixou. Na primeira tela dele, cole os 4 dados pedidos — a chave abaixo, mais o IP,
        número de série e código de acesso que você anotou no Passo 1.
      </p>
      <div>
        <label className="mb-1.5 block text-xs text-text-muted">Chave desta impressora</label>
        <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.03] px-3 py-2.5">
          <code className="flex-1 truncate text-xs text-text-secondary">{apiKey ?? "—"}</code>
          <button
            type="button"
            onClick={onCopy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-glass px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary"
          >
            {copied ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Depois de preencher e clicar em salvar no programa, volte aqui e clique em "Próximo".
      </p>
    </div>
  );
}

function Step4({ connected, checking }: { connected: boolean; checking: boolean }) {
  if (connected) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-8 text-center">
        <CheckCircle2 size={32} className="text-neon-green" />
        <p className="font-medium text-text-primary">Conectado com sucesso!</p>
        <p className="text-xs text-text-muted">Sua impressora já está enviando dados pro MakerFlow.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border-glass bg-white/[0.03] px-4 py-8 text-center">
      <Loader2 size={28} className={cn("text-neon-pink", checking && "animate-spin")} />
      <p className="font-medium text-text-primary">Aguardando primeira telemetria...</p>
      <p className="text-xs text-text-muted">
        Deixe o programa aberto no seu computador. Assim que ele mandar o primeiro dado, essa tela atualiza
        sozinha — não precisa ficar recarregando a página.
      </p>
    </div>
  );
}
