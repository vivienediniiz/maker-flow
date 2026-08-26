"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { StoreBrandingCard } from "@/components/dashboard/StoreBrandingCard";
import { StoreBannersCard } from "@/components/dashboard/StoreBannersCard";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import { ExternalLink, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://maker-flow.netlify.app";

export default function StorePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState("");
  const [headline, setHeadline] = useState("");
  const [studioName, setStudioName] = useState("");
  const [paymentConnected, setPaymentConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStore() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [{ data: profile }, { data: integration }] = await Promise.all([
      supabase
        .from("profiles")
        .select("store_enabled, store_slug, store_headline, studio_name, full_name")
        .eq("id", user.id)
        .single(),
      supabase
        .from("integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", "mercado_pago")
        .eq("status", "connected")
        .maybeSingle(),
    ]);

    setStoreEnabled(profile?.store_enabled ?? false);
    setStoreSlug(profile?.store_slug ?? null);
    setSlugInput(profile?.store_slug ?? slugify(profile?.studio_name || profile?.full_name || "meu-estudio"));
    setHeadline(profile?.store_headline ?? "");
    setStudioName(profile?.studio_name || profile?.full_name || "");
    setPaymentConnected(!!integration);
    setLoading(false);
  }

  /** Tenta salvar o slug candidato; em caso de conflito de unicidade (23505), tenta variações com sufixo numérico. */
  async function saveUniqueSlug(candidate: string, extraPatch: Record<string, unknown> = {}): Promise<string> {
    const root = slugify(candidate) || "meu-estudio";
    for (let attempt = 0; attempt < 20; attempt++) {
      const tryingSlug = attempt === 0 ? root : `${root}-${attempt + 1}`;
      const { error } = await supabase
        .from("profiles")
        .update({ store_slug: tryingSlug, ...extraPatch })
        .eq("id", userId);
      if (!error) return tryingSlug;
      if (error.code !== "23505") throw error;
    }
    throw new Error("Não foi possível gerar um link único pra sua loja.");
  }

  async function handleToggleEnabled(next: boolean) {
    setSaving(true);
    setSlugError(null);
    try {
      if (next && !storeSlug) {
        const finalSlug = await saveUniqueSlug(slugInput, { store_enabled: true });
        setStoreSlug(finalSlug);
        setSlugInput(finalSlug);
      } else {
        await supabase.from("profiles").update({ store_enabled: next }).eq("id", userId);
      }
      setStoreEnabled(next);
    } catch (err) {
      setSlugError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSlug() {
    setSaving(true);
    setSlugError(null);
    try {
      const finalSlug = await saveUniqueSlug(slugInput);
      setStoreSlug(finalSlug);
      setSlugInput(finalSlug);
    } catch (err) {
      setSlugError("Esse link já está em uso — tente outro.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveHeadline() {
    setSaving(true);
    await supabase.from("profiles").update({ store_headline: headline.trim() || null }).eq("id", userId);
    setSaving(false);
  }

  function handleCopyLink() {
    if (!storeSlug) return;
    navigator.clipboard.writeText(`${SITE_URL}/loja/${storeSlug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <>
        <Topbar title="Minha Loja" />
        <main className="flex justify-center px-6 py-16 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Minha Loja" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <GlassCard padding="lg" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg">Vitrine pública</h3>
              <p className="text-sm text-text-secondary">
                Ative uma loja online pra vender direto pro consumidor final, com checkout via Mercado Pago.
              </p>
            </div>
            <Toggle checked={storeEnabled} onChange={handleToggleEnabled} label={storeEnabled ? "Ativada" : "Desativada"} />
          </div>

          {!paymentConnected && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                Conecte o Mercado Pago em{" "}
                <Link href="/dashboard/integrations" className="underline hover:text-amber-200">
                  Integrações
                </Link>{" "}
                pra sua loja aceitar pagamentos — sem isso, a página fica visível mas indisponível pra compra.
              </span>
            </div>
          )}

          {storeSlug && (
            <div className="flex items-center gap-2 rounded-xl border border-border-glass bg-white/[0.02] px-3 py-2.5">
              <a
                href={`/loja/${storeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-neon-pink hover:underline"
              >
                <ExternalLink size={13} className="shrink-0" /> {SITE_URL.replace(/^https?:\/\//, "")}/loja/{storeSlug}
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-neon-pink"
              >
                {copied ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          )}
        </GlassCard>

        <GlassCard padding="lg" className="space-y-4">
          <h3 className="font-display text-lg">Configuração</h3>

          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Link da loja</label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-text-muted">/loja/</span>
              <input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                className="glass-input w-full"
                placeholder="studio-diniz"
              />
              <NeonButton type="button" variant="outline" size="sm" onClick={handleSaveSlug} disabled={saving}>
                Salvar
              </NeonButton>
            </div>
            {slugError && <p className="mt-1.5 text-[11px] text-red-400">{slugError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Frase de destaque (opcional)</label>
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              onBlur={handleSaveHeadline}
              rows={2}
              className="glass-input w-full resize-none"
              placeholder="Ex: Peças personalizadas em impressão 3D, feitas com carinho."
            />
          </div>

          <p className="text-[11px] text-text-muted">
            Escolha quais produtos aparecem na loja e a ordem deles em{" "}
            <Link href="/dashboard/products" className="text-neon-pink hover:underline">
              Produtos
            </Link>
            . Prazo de produção e personalização também são configurados por produto lá.
          </p>
        </GlassCard>

        {userId && (
          <>
            <StoreBrandingCard userId={userId} studioName={studioName} />
            <StoreBannersCard userId={userId} />
          </>
        )}
      </main>
    </>
  );
}
