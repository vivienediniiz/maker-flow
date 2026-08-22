"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { Loader2, Users, Gift, Wallet, ArrowRight } from "lucide-react";

interface AffiliateStats {
  total_referrals: number;
  total_conversions: number;
  total_commission_pending: number;
  total_commission_paid: number;
}

function StatBlock({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-neon-pink">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-text-muted">{label}</p>
        <p className="font-numeric truncate text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

export function AffiliateSummaryCard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AffiliateStats | null>(null);

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

      const { data } = await supabase.rpc("get_affiliate_stats").single();
      setStats((data as AffiliateStats) ?? null);
      setLoading(false);
    })();
  }, []);

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
        <div className="grid grid-cols-2 gap-2.5">
          <StatBlock icon={Users} label="Indicações" value={String(stats?.total_referrals ?? 0)} />
          <StatBlock icon={Gift} label="Convertidos" value={String(stats?.total_conversions ?? 0)} />
          <StatBlock icon={Wallet} label="Comissão pendente" value={formatBRL(pending)} />
          <StatBlock icon={Wallet} label="Comissão paga" value={formatBRL(paid)} />
        </div>
      )}
    </GlassCard>
  );
}
