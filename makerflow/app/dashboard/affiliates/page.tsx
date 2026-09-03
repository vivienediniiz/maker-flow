"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { KpiCard } from "@/components/ui/KpiCard";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { generateAffiliateCode, buildAffiliateLink, AFFILIATE_COMMISSION_RATE } from "@/lib/affiliates";
import { getPlan } from "@/lib/plans";
import { Copy, Check, Users, Gift, Wallet, Loader2 } from "lucide-react";
import type { AffiliateCommission } from "@/lib/types";

interface AffiliateStats {
  total_referrals: number;
  total_conversions: number;
  total_commission_pending: number;
  total_commission_paid: number;
}

export default function AffiliatesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: profile }, { data: statsData }, { data: commissionsData }] = await Promise.all([
      supabase.from("profiles").select("affiliate_code").eq("id", user.id).single(),
      supabase.rpc("get_affiliate_stats").single(),
      supabase
        .from("affiliate_commissions")
        .select("*")
        .eq("affiliate_user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    setAffiliateCode(profile?.affiliate_code ?? null);
    setStats((statsData as AffiliateStats) ?? null);
    setCommissions((commissionsData as AffiliateCommission[]) ?? []);
    setLoading(false);
  }

  async function handleGenerateCode() {
    setGenerating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGenerating(false);
      return;
    }

    // Colisão de código é raríssima (6 bytes aleatórios), mas tenta de novo
    // algumas vezes se acontecer, já que a coluna é unique.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateAffiliateCode();
      const { data, error } = await supabase
        .from("profiles")
        .update({ affiliate_code: code })
        .eq("id", user.id)
        .select("affiliate_code")
        .single();
      if (!error && data) {
        setAffiliateCode(data.affiliate_code);
        break;
      }
    }
    setGenerating(false);
  }

  function handleCopy() {
    if (!affiliateCode) return;
    navigator.clipboard.writeText(buildAffiliateLink(affiliateCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Topbar title="Afiliados" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <GlassCard padding="lg" className="space-y-4">
          <div>
            <h3 className="font-display text-lg">Seu link de indicação</h3>
            <p className="text-sm text-text-secondary">
              Compartilhe com outros makers — quando alguém assina um plano pago pelo seu link, você ganha{" "}
              {(AFFILIATE_COMMISSION_RATE * 100).toFixed(0)}% da primeira cobrança dela como comissão.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6 text-text-muted">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : affiliateCode ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={buildAffiliateLink(affiliateCode)}
                className="glass-input w-full flex-1 cursor-text"
                onFocus={(e) => e.target.select()}
              />
              <NeonButton type="button" variant="outline" onClick={handleCopy} className="shrink-0">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copiado!" : "Copiar link"}
              </NeonButton>
            </div>
          ) : (
            <NeonButton type="button" onClick={handleGenerateCode} disabled={generating}>
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} Gerar meu link de
              afiliado
            </NeonButton>
          )}

          <p className="text-[11px] text-text-muted">
            Comissão só na primeira cobrança de cada indicado (não é recorrente). O pagamento da comissão é
            combinado diretamente com o StudioMaker — este painel só mostra o que já acumulou.
          </p>
        </GlassCard>

        {!loading && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Indicações" value={String(stats?.total_referrals ?? 0)} icon={Users} accent="pink" />
              <KpiCard
                label="Assinantes convertidos"
                value={String(stats?.total_conversions ?? 0)}
                icon={Gift}
                accent="purple"
              />
              <KpiCard
                label="Comissão pendente"
                value={formatBRL(stats?.total_commission_pending ?? 0)}
                icon={Wallet}
                accent="orange"
              />
              <KpiCard
                label="Comissão já paga"
                value={formatBRL(stats?.total_commission_paid ?? 0)}
                icon={Wallet}
                accent="green"
              />
            </section>

            <section>
              <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-text-muted">
                Comissões ({commissions.length})
              </h3>
              {commissions.length === 0 ? (
                <GlassCard padding="lg" className="text-center text-sm text-text-muted">
                  Nenhuma comissão registrada ainda — assim que alguém assinar pelo seu link, aparece aqui.
                </GlassCard>
              ) : (
                <div className="glass-card divide-y divide-border-glass overflow-hidden">
                  {commissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary">
                          Plano {getPlan(c.plan_id).name}
                        </p>
                        <p className="text-xs text-text-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={
                            c.status === "paid"
                              ? "rounded-pill border border-neon-green/30 bg-neon-green/10 px-2.5 py-1 text-[10px] font-medium text-neon-green"
                              : "rounded-pill border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400"
                          }
                        >
                          {c.status === "paid" ? "Paga" : "Pendente"}
                        </span>
                        <span className="font-numeric text-sm font-semibold text-neon-pink">
                          {formatBRL(c.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
