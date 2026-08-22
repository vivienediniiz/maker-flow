"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { generateAffiliateCode, buildAffiliateLink } from "@/lib/affiliates";
import { Loader2, Users, Gift, Wallet, ArrowRight, Copy, Check, Link2 } from "lucide-react";

interface AffiliateStats {
  total_referrals: number;
  total_conversions: number;
  total_commission_pending: number;
  total_commission_paid: number;
}

function StatBlock({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border-glass bg-white/[0.02] px-2 py-2.5 text-center">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-neon-pink">
        <Icon size={12} />
      </span>
      <p className="font-numeric truncate text-lg font-semibold text-text-primary">{value}</p>
      <p className="truncate text-[10px] leading-snug text-text-muted">{label}</p>
    </div>
  );
}

export function AffiliateSummaryCard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: statsData }, { data: profile }] = await Promise.all([
        supabase.rpc("get_affiliate_stats").single(),
        supabase.from("profiles").select("affiliate_code").eq("id", user.id).single(),
      ]);
      setStats((statsData as AffiliateStats) ?? null);
      setAffiliateCode(profile?.affiliate_code ?? null);
      setLoading(false);
    })();
  }, []);

  async function handleGenerateLink() {
    setGenerating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setGenerating(false);
      return;
    }

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

  const pending = stats?.total_commission_pending ?? 0;
  const paid = stats?.total_commission_paid ?? 0;

  return (
    <GlassCard padding="lg" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-wider text-text-muted">Indicações</h3>
        <Link href="/dashboard/affiliates" className="flex items-center gap-1 text-xs text-neon-pink hover:underline">
          Ver detalhes <ArrowRight size={12} />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6 text-text-muted">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <StatBlock icon={Users} label="Indicações" value={String(stats?.total_referrals ?? 0)} />
            <StatBlock icon={Gift} label="Convertidos" value={String(stats?.total_conversions ?? 0)} />
            <StatBlock icon={Wallet} label="Comissão pendente" value={formatBRL(pending)} />
            <StatBlock icon={Wallet} label="Comissão paga" value={formatBRL(paid)} />
          </div>

          {affiliateCode ? (
            <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2">
              <Link2 size={13} className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{buildAffiliateLink(affiliateCode)}</span>
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-medium transition-colors",
                  copied ? "text-neon-green" : "text-neon-pink hover:bg-white/5"
                )}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={generating}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-glassStrong px-3 py-2.5 text-xs font-medium text-text-secondary transition-colors hover:border-neon-pink/40 hover:text-neon-pink disabled:opacity-60"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}{" "}
              {generating ? "Gerando..." : "Gerar link rápido de indicação"}
            </button>
          )}
        </>
      )}
    </GlassCard>
  );
}
