"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { IntegrationCard } from "@/components/dashboard/IntegrationCard";
import { MercadoPagoCredentialsModal } from "@/components/dashboard/MercadoPagoCredentialsModal";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import type { Integration, IntegrationPlatform } from "@/lib/types";

const PLATFORMS: IntegrationPlatform[] = ["mercado_pago", "shopee", "tiktok_shop"];

export default function IntegrationsPage() {
  const supabase = createClient();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [mpModalOpen, setMpModalOpen] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

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
                onConnect={() => {
                  if (platform === "mercado_pago") setMpModalOpen(true);
                }}
                onDisconnected={loadIntegrations}
              />
            ))}
          </div>
        )}
      </main>

      <MercadoPagoCredentialsModal
        open={mpModalOpen}
        onClose={() => setMpModalOpen(false)}
        onConnected={loadIntegrations}
      />
    </>
  );
}
