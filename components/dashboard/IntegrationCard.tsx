"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, AlertCircle, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { cn } from "@/lib/utils";
import type { Integration, IntegrationPlatform } from "@/lib/types";

const PLATFORM_LABELS: Record<IntegrationPlatform, string> = {
  mercado_pago: "Mercado Pago",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
};

const PLATFORM_DESCRIPTIONS: Record<IntegrationPlatform, string> = {
  mercado_pago: "Conecte sua conta pra receber vendas automaticamente via notificação de pagamento.",
  shopee: "Conecte sua loja pra receber pedidos automaticamente.",
  tiktok_shop: "Conecte sua loja pra receber pedidos automaticamente.",
};

function formatLastEvent(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

export function IntegrationCard({
  platform,
  integration,
  onConnect,
  onDisconnected,
}: {
  platform: IntegrationPlatform;
  integration: Integration | null;
  onConnect: () => void;
  onDisconnected: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const status = integration?.status ?? "disconnected";
  const isOAuthPlatform = platform !== "mercado_pago";

  async function handleDisconnect() {
    if (!confirm(`Desconectar ${PLATFORM_LABELS[platform]}? As credenciais salvas serão removidas.`)) return;
    setDisconnecting(true);
    await fetch(`/api/integrations/${platform}/disconnect`, { method: "POST" });
    setDisconnecting(false);
    onDisconnected();
  }

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg">{PLATFORM_LABELS[platform]}</p>
          <p className="mt-1 text-xs text-text-muted">{PLATFORM_DESCRIPTIONS[platform]}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="text-xs text-text-muted">
        Última sincronização: <span className="text-text-secondary">{formatLastEvent(integration?.last_event_at ?? null)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        {status === "connected" ? (
          <NeonButton variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? <Loader2 size={14} className="animate-spin" /> : "Desconectar"}
          </NeonButton>
        ) : isOAuthPlatform ? (
          <NeonButton
            size="sm"
            disabled
            className="opacity-40"
            title="Aguardando aprovação do app na plataforma"
          >
            Conectar
          </NeonButton>
        ) : (
          <NeonButton size="sm" onClick={onConnect}>
            Configurar
          </NeonButton>
        )}
      </div>
      {isOAuthPlatform && status !== "connected" && (
        <p className="text-[11px] text-amber-400">Aguardando aprovação do app — em breve.</p>
      )}
    </GlassCard>
  );
}

function StatusBadge({ status }: { status: "connected" | "disconnected" | "error" }) {
  const config = {
    connected: { icon: CheckCircle2, label: "Conectado", className: "bg-neon-green/15 text-neon-green border-neon-green/30" },
    disconnected: { icon: CircleDashed, label: "Desconectado", className: "bg-white/10 text-text-secondary border-white/10" },
    error: { icon: AlertCircle, label: "Erro", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  }[status];

  const Icon = config.icon;

  return (
    <span className={cn("flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11px] font-medium", config.className)}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}
