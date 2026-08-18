"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Topbar } from "@/components/dashboard/Topbar";
import { IntegrationCard } from "@/components/dashboard/IntegrationCard";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { Integration, IntegrationPlatform } from "@/lib/types";

// Mercado Pago escondido da aba de propósito (Vendas continua recebendo
// webhook normalmente se algum maker já tiver conectado antes).
const PLATFORMS: IntegrationPlatform[] = ["mercado_livre", "shopee", "tiktok_shop", "melhor_envio"];

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<Topbar title="Integrações" />}>
      <IntegrationsPageContent />
    </Suspense>
  );
}

function IntegrationsPageContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const mlConnected = searchParams.get("ml_connected");
  const mlError = searchParams.get("ml_error");
  const meConnected = searchParams.get("me_connected");
  const meError = searchParams.get("me_error");

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    if (!mlConnected && !mlError && !meConnected && !meError) return;
    // Limpa os query params depois de mostrar o resultado, pra não reaparecer num refresh.
    const timeout = setTimeout(() => router.replace("/dashboard/integrations"), 4000);
    return () => clearTimeout(timeout);
  }, [mlConnected, mlError, meConnected, meError, router]);

  async function loadIntegrations() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("integrations").select("*").eq("user_id", user.id);
    setIntegrations((data as Integration[]) ?? []);
    setLoading(false);
  }

  function integrationFor(platform: IntegrationPlatform) {
    return integrations.find((i) => i.platform === platform) ?? null;
  }

  return (
    <>
      <Topbar title="Integrações" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <p className="max-w-2xl text-sm text-text-secondary">
          Conecte suas contas de vendas pra receber pedidos automaticamente em Vendas, via webhook — sem precisar
          importar nada manualmente.
        </p>

        {mlConnected && (
          <div className="flex items-center gap-2 rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-3 text-sm text-neon-green">
            <CheckCircle2 size={16} /> Mercado Livre conectado com sucesso.
          </div>
        )}
        {mlError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle size={16} /> Falha ao conectar Mercado Livre: {mlError}
          </div>
        )}
        {meConnected && (
          <div className="flex items-center gap-2 rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-3 text-sm text-neon-green">
            <CheckCircle2 size={16} /> Melhor Envio conectado com sucesso.
          </div>
        )}
        {meError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle size={16} /> Falha ao conectar Melhor Envio: {meError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORMS.map((platform) => (
              <IntegrationCard
                key={platform}
                platform={platform}
                integration={integrationFor(platform)}
                onDisconnected={loadIntegrations}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
