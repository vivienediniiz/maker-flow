"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { CheckCircle2, Lock, Truck } from "lucide-react";

const QUOTES = [
  { carrier: "Correios PAC", eta: "6-9 dias úteis", price: 22.4 },
  { carrier: "Correios SEDEX", eta: "2-4 dias úteis", price: 38.9 },
  { carrier: "Jadlog Package", eta: "4-7 dias úteis", price: 19.8 },
  { carrier: "Loggi Ponto a Ponto", eta: "1-2 dias úteis", price: 27.5 },
];

export default function ShippingPage() {
  const supabase = createClient();
  const [quoted, setQuoted] = useState(false);
  const [originCep, setOriginCep] = useState("");
  const [destinationCep, setDestinationCep] = useState("");
  const [loadingOrigin, setLoadingOrigin] = useState(true);

  async function loadOriginCep() {
    setLoadingOrigin(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadingOrigin(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("cep")
      .eq("id", user.id)
      .single();

    const { data: settings } = await supabase
      .from("settings")
      .select("origin_cep")
      .eq("user_id", user.id)
      .single();

    setOriginCep(profile?.cep || settings?.origin_cep || "");
    setLoadingOrigin(false);
  }

  useEffect(() => {
    loadOriginCep();
  }, [supabase]);

  useEffect(() => {
    function onStudioAddressUpdated(e: Event) {
      const detail = (e as CustomEvent<{ cep: string | null }>).detail;
      setOriginCep(detail?.cep || "");
    }
    window.addEventListener("studio-address-updated", onStudioAddressUpdated);
    return () => window.removeEventListener("studio-address-updated", onStudioAddressUpdated);
  }, []);

  return (
    <>
      <Topbar title="Cálculo de Frete" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="inline-flex items-center gap-2 rounded-pill border border-neon-green/30 bg-neon-green/10 px-4 py-2 text-xs font-medium text-neon-green">
          <CheckCircle2 size={14} /> Melhor Envio Conectado
        </div>

        <GlassCard padding="lg" className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="CEP de origem" hint={<Lock size={11} />}>
              <input
                value={loadingOrigin ? "Carregando..." : originCep}
                readOnly
                placeholder="Cadastre em Minha conta"
                className="glass-input w-full cursor-not-allowed opacity-70"
              />
            </Field>
            <Field label="CEP de destino">
              <input
                value={destinationCep}
                onChange={(e) => setDestinationCep(e.target.value)}
                placeholder="00000-000"
                className="glass-input w-full"
              />
            </Field>
          </div>

          {!loadingOrigin && !originCep && (
            <p className="text-xs text-amber-400">
              Cadastre o CEP do seu estúdio em{" "}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("open-account-modal"))}
                className="underline hover:text-amber-300"
              >
                Minha conta
              </button>{" "}
              para usá-lo como origem padrão do frete.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Peso (kg)"><input type="number" className="glass-input w-full" /></Field>
            <Field label="Altura (cm)"><input type="number" className="glass-input w-full" /></Field>
            <Field label="Largura (cm)"><input type="number" className="glass-input w-full" /></Field>
            <Field label="Comprimento (cm)"><input type="number" className="glass-input w-full" /></Field>
          </div>
          <NeonButton onClick={() => setQuoted(true)} disabled={!originCep}>
            <Truck size={16} /> Cotar frete
          </NeonButton>
        </GlassCard>

        {quoted && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUOTES.map((q) => (
              <GlassCard key={q.carrier} hover padding="md" className="space-y-2">
                <p className="text-sm font-medium text-text-primary">{q.carrier}</p>
                <p className="text-xs text-text-muted">{q.eta}</p>
                <p className="neon-text font-numeric text-xl font-semibold">{formatBRL(q.price)}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-text-muted">
        {label}
        {hint}
      </label>
      {children}
    </div>
  );
}
