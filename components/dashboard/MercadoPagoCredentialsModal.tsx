"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { PasswordInput } from "@/components/ui/PasswordInput";

interface MercadoPagoCredentialsModalProps {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export function MercadoPagoCredentialsModal({ open, onClose, onConnected }: MercadoPagoCredentialsModalProps) {
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClose() {
    setAccessToken("");
    setWebhookSecret("");
    setError(null);
    setWebhookUrl(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/integrations/mercado-pago/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, webhookSecret: webhookSecret || undefined }),
    });
    const data = await res.json();

    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Falha ao conectar.");
      return;
    }

    setWebhookUrl(data.webhookUrl);
    onConnected();
  }

  function copyWebhookUrl() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (webhookUrl) {
    return (
      <Modal open={open} onClose={handleClose} title="Mercado Pago conectado">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Falta um passo: cole essa URL no seu painel do Mercado Pago (Configurações → Webhooks → Notificações
            IPN), no evento <strong className="text-text-primary">Pagamentos</strong>.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.03] px-3 py-2.5">
            <code className="flex-1 truncate text-xs text-text-secondary">{webhookUrl}</code>
            <button
              type="button"
              onClick={copyWebhookUrl}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-glass px-2.5 py-1 text-[11px] text-text-secondary hover:text-text-primary"
            >
              {copied ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <div className="flex justify-end pt-2">
            <NeonButton type="button" onClick={handleClose}>
              Concluir
            </NeonButton>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Conectar Mercado Pago">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-secondary">
          Pegue o Access Token de produção no seu painel de desenvolvedor do Mercado Pago (Suas integrações → a
          aplicação → Credenciais de produção).
        </p>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Access Token</label>
          <PasswordInput
            required
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="APP_USR-..."
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">
            Chave secreta do Webhook <span className="text-text-muted/60">(opcional, recomendado)</span>
          </label>
          <PasswordInput
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder="Copie de Webhooks → detalhes da assinatura"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Conectando..." : "Conectar"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
