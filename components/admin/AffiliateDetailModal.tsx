"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { useConfirm } from "@/components/dashboard/ConfirmDialogContext";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { buildAffiliateLink, AFFILIATE_COMMISSION_RATE } from "@/lib/affiliates";
import { getPlan, planDisplayLabel } from "@/lib/plans";
import { Copy, Check, Loader2, Wallet, Mail } from "lucide-react";
import type { AdminSubscriberRow, AffiliateCommission, SubscriptionTier, SubscriptionStatus } from "@/lib/types";

interface ReferredCustomer {
  user_id: string;
  full_name: string;
  email: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export function AffiliateDetailModal({
  affiliate,
  onClose,
  onUpdated,
}: {
  affiliate: AdminSubscriberRow | null;
  onClose: () => void;
  onUpdated: (patch: Partial<AdminSubscriberRow>) => void;
}) {
  const supabase = createClient();
  const confirm = useConfirm();
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [referred, setReferred] = useState<ReferredCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rateInput, setRateInput] = useState("");
  const [pixInput, setPixInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [payingAll, setPayingAll] = useState(false);

  useEffect(() => {
    if (!affiliate) return;
    setRateInput(affiliate.affiliate_commission_rate != null ? String(affiliate.affiliate_commission_rate * 100) : "");
    setPixInput(affiliate.affiliate_pix_key ?? "");
    loadData(affiliate.user_id);
  }, [affiliate?.user_id]);

  async function loadData(affiliateUserId: string) {
    setLoading(true);
    const [{ data: commissionsData }, { data: referredData }] = await Promise.all([
      supabase.from("affiliate_commissions").select("*").eq("affiliate_user_id", affiliateUserId).order("created_at", { ascending: false }),
      supabase
        .from("admin_subscribers_view")
        .select("user_id, full_name, email, subscription_tier, subscription_status, created_at")
        .eq("referred_by", affiliateUserId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setCommissions((commissionsData as AffiliateCommission[]) ?? []);
    setReferred((referredData as ReferredCustomer[]) ?? []);
    setLoading(false);
  }

  if (!affiliate) return null;

  const effectiveRate = affiliate.affiliate_commission_rate ?? AFFILIATE_COMMISSION_RATE;
  const revenueGenerated = commissions.reduce((sum, c) => sum + getPlan(c.plan_id).price, 0);
  const pending = commissions.filter((c) => c.status === "pending");
  const paid = commissions.filter((c) => c.status === "paid");
  const pendingTotal = pending.reduce((sum, c) => sum + c.amount, 0);
  const paidTotal = paid.reduce((sum, c) => sum + c.amount, 0);

  function handleCopyLink() {
    if (!affiliate?.affiliate_code) return;
    navigator.clipboard.writeText(buildAffiliateLink(affiliate.affiliate_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggleActive(next: boolean) {
    await supabase.from("profiles").update({ affiliate_active: next }).eq("id", affiliate!.user_id);
    onUpdated({ affiliate_active: next });
  }

  async function handleSaveConfig() {
    setSaving(true);
    const rate = rateInput.trim() === "" ? null : Number(rateInput) / 100;
    const patch = {
      affiliate_commission_rate: rate,
      affiliate_pix_key: pixInput.trim() || null,
    };
    const { error } = await supabase.from("profiles").update(patch).eq("id", affiliate!.user_id);
    setSaving(false);
    if (!error) onUpdated(patch);
  }

  async function handleMarkPaid(commissionId: string) {
    setCommissions((prev) => prev.map((c) => (c.id === commissionId ? { ...c, status: "paid" } : c)));
    await supabase.from("affiliate_commissions").update({ status: "paid" }).eq("id", commissionId);
  }

  async function handlePayAllPending() {
    if (pending.length === 0) return;
    if (!(await confirm(`Marcar ${pending.length} comissão${pending.length > 1 ? "ões" : ""} como paga${pending.length > 1 ? "s" : ""}? Confirme só depois de já ter feito a transferência de verdade pra ${affiliate!.affiliate_pix_key || "o afiliado"}.`))) {
      return;
    }
    setPayingAll(true);
    const ids = pending.map((c) => c.id);
    setCommissions((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, status: "paid" } : c)));
    await supabase.from("affiliate_commissions").update({ status: "paid" }).in("id", ids);
    setPayingAll(false);
  }

  return (
    <Modal open={!!affiliate} onClose={onClose} title={affiliate.full_name || affiliate.email} maxWidthClass="max-w-lg">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto scrollbar-glass pr-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-pill border px-2.5 py-1 text-[11px] font-medium",
                affiliate.affiliate_active ? "bg-neon-green/15 text-neon-green border-neon-green/30" : "bg-white/10 text-text-secondary border-white/10"
              )}
            >
              {affiliate.affiliate_active ? "Ativo" : "Inativo"}
            </span>
            <span className="text-xs text-text-muted">{affiliate.email}</span>
          </div>
          <Toggle checked={affiliate.affiliate_active} onChange={handleToggleActive} />
        </div>

        <div className="glass-card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] text-text-muted">Código</p>
              <p className="truncate text-sm text-text-primary">{affiliate.affiliate_code}</p>
            </div>
            <NeonButton type="button" variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiado" : "Copiar link"}
            </NeonButton>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Comissão % (padrão: {(AFFILIATE_COMMISSION_RATE * 100).toFixed(0)}%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder={`${(AFFILIATE_COMMISSION_RATE * 100).toFixed(0)}`}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-text-muted">Chave PIX (pra pagar comissão)</label>
              <input value={pixInput} onChange={(e) => setPixInput(e.target.value)} className="glass-input w-full" placeholder="e-mail, telefone ou CPF" />
            </div>
          </div>
          <NeonButton type="button" size="sm" onClick={handleSaveConfig} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Configuração"}
          </NeonButton>
          <p className="text-[11px] text-text-muted">
            Comissão em uso hoje: <span className="text-text-secondary">{(effectiveRate * 100).toFixed(0)}%</span> — vale só pra
            conversões novas, não recalcula comissão já gerada.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-6 text-text-muted">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">Indicados / Convertidos</p>
                <p className="font-numeric mt-1 text-lg font-semibold text-text-primary">
                  {referred.length} / {commissions.length}
                </p>
              </div>
              <div className="rounded-xl border border-border-glass bg-white/[0.02] px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">Receita Gerada</p>
                <p className="font-numeric mt-1 text-lg font-semibold text-text-primary">{formatBRL(revenueGenerated)}</p>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-amber-400">Comissão Pendente</p>
                <p className="font-numeric mt-1 text-lg font-semibold text-amber-300">{formatBRL(pendingTotal)}</p>
              </div>
              <div className="rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-neon-green">Comissão Paga</p>
                <p className="font-numeric mt-1 text-lg font-semibold text-neon-green">{formatBRL(paidTotal)}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Histórico de Comissões ({commissions.length})</p>
                {pending.length > 0 && (
                  <NeonButton type="button" variant="outline" size="sm" onClick={handlePayAllPending} disabled={payingAll}>
                    {payingAll ? <Loader2 size={12} className="animate-spin" /> : <Wallet size={12} />} Pagar Pendentes
                  </NeonButton>
                )}
              </div>
              {commissions.length === 0 ? (
                <p className="text-xs text-text-muted">Nenhuma comissão ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {commissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border-glass bg-white/[0.02] px-3 py-2 text-xs">
                      <div>
                        <p className="text-text-secondary">{planDisplayLabel(c.plan_id)}</p>
                        <p className="text-text-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-numeric font-medium text-text-primary">{formatBRL(c.amount)}</span>
                        {c.status === "paid" ? (
                          <span className="rounded-pill border border-neon-green/30 bg-neon-green/10 px-2 py-0.5 text-[10px] text-neon-green">Paga</span>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(c.id)}
                            className="rounded-pill border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-500/20"
                          >
                            Marcar Pago
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">Clientes Trazidos ({referred.length})</p>
              {referred.length === 0 ? (
                <p className="text-xs text-text-muted">Ninguém se cadastrou pelo link ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {referred.map((r) => (
                    <div key={r.user_id} className="flex items-center justify-between rounded-lg border border-border-glass bg-white/[0.02] px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate text-text-secondary">{r.full_name || r.email}</p>
                        <p className="text-text-muted">{planDisplayLabel(r.subscription_tier)}</p>
                      </div>
                      <span className="shrink-0 text-text-muted">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <NeonButton type="button" variant="ghost" size="sm" disabled className="w-full justify-center opacity-40" title="Sem infraestrutura de e-mail transacional configurada ainda">
          <Mail size={13} /> Enviar E-mail
        </NeonButton>
      </div>
    </Modal>
  );
}
