"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, AlertCircle, Loader2, Lock } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import { cn } from "@/lib/utils";
import type { Integration, IntegrationPlatform } from "@/lib/types";

const PLATFORM_LABELS: Record<IntegrationPlatform, string> = {
  mercado_pago: "Mercado Pago",
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
  melhor_envio: "Melhor Envio",
};

const PLATFORM_DESCRIPTIONS: Record<IntegrationPlatform, string> = {
  mercado_pago: "Autorize o StudioMaker a acessar sua conta e receber vendas automaticamente.",
  mercado_livre: "Conecte sua conta vendedora pra receber pedidos do Mercado Livre automaticamente.",
  shopee: "Conecte sua loja pra receber pedidos automaticamente.",
  tiktok_shop: "Conecte sua loja pra receber pedidos automaticamente.",
  melhor_envio: "Conecte sua conta pra cotar frete, comprar e imprimir etiquetas direto pelo StudioMaker.",
};

// Mercado Pago, Mercado Livre e Melhor Envio já conectam de verdade via OAuth.
// Shopee/TikTok Shop ficam desabilitados até o app do StudioMaker ser aprovado nas duas plataformas.
const AVAILABLE_PLATFORMS: IntegrationPlatform[] = ["mercado_pago", "mercado_livre", "melhor_envio"];

// As pastas de rota de /api/integrations/*/connect usam hífen (padrão de URL),
// mas o valor do tipo/enum usa underscore (padrão de coluna) — os dois nomes
// não são o mesmo texto, por isso o slug precisa de um mapeamento explícito
// em vez de usar `platform` direto na URL.
const PLATFORM_CONNECT_SLUGS: Record<IntegrationPlatform, string> = {
  mercado_pago: "mercado-pago",
  mercado_livre: "mercado-livre",
  shopee: "shopee",
  tiktok_shop: "tiktok-shop",
  melhor_envio: "melhor-envio",
};

function formatLastEvent(iso: string | null) {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

export function IntegrationCard({
  platform,
  integration,
  onDisconnected,
}: {
  platform: IntegrationPlatform;
  integration: Integration | null;
  onDisconnected: () => void;
}) {
  const router = useRouter();
  const { paid } = useSubscription();
  const confirm = useConfirm();
  const [disconnecting, setDisconnecting] = useState(false);
  const status = integration?.status ?? "disconnected";
  const available = AVAILABLE_PLATFORMS.includes(platform);

  async function handleDisconnect() {
    const extra =
      platform === "mercado_pago"
        ? "\n\nIsso apaga a credencial aqui no StudioMaker, mas o Mercado Pago não tem revogação por API — pra remover o acesso na sua conta MP também, vá em Configurações → Aplicativos autorizados, na própria conta Mercado Pago."
        : "";
    if (!(await confirm(`Desconectar ${PLATFORM_LABELS[platform]}? As credenciais salvas serão removidas.${extra}`))) return;
    setDisconnecting(true);
    await fetch(`/api/integrations/${platform}/disconnect`, { method: "POST" });
    setDisconnecting(false);
    onDisconnected();
  }

  function handleConnect() {
    if (!paid) {
      router.push("/dashboard/subscription");
      return;
    }
    window.location.href = `/api/integrations/${PLATFORM_CONNECT_SLUGS[platform]}/connect`;
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
        ) : available ? (
          <NeonButton size="sm" onClick={handleConnect}>
            {!paid && <Lock size={14} />} Conectar
          </NeonButton>
        ) : (
          <NeonButton size="sm" disabled className="opacity-40" title="Aguardando aprovação do app na plataforma">
            Conectar
          </NeonButton>
        )}
      </div>
      {!available && status !== "connected" && (
        <p className="text-[11px] text-amber-400">Aguardando aprovação do app — em breve.</p>
      )}
      {available && !paid && status !== "connected" && (
        <p className="text-[11px] text-amber-400">Recurso pago — assine um plano pra conectar.</p>
      )}
      {platform === "mercado_pago" && status === "connected" && (
        <p className="text-[11px] text-text-muted">
          "Desconectar" remove a credencial aqui. Pra revogar na sua conta Mercado Pago também, veja Aplicativos
          autorizados nas configurações da conta MP.
        </p>
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
