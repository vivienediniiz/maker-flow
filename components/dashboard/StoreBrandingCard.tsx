"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Store as StoreIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { STORE_TITLE_FONTS, getStoreFont, DEFAULT_STORE_PRIMARY_COLOR, DEFAULT_STORE_SECONDARY_COLOR } from "@/lib/storeFonts";
import type { StoreSettings } from "@/lib/types";

interface StoreBrandingCardProps {
  userId: string;
  studioName: string;
}

/**
 * Identidade visual + WhatsApp da loja: logo, 2 cores (destaque + fundo) e
 * fonte de título — deliberadamente controlado (não é um editor de CSS
 * livre), com preview ao vivo do topo da loja.
 */
export function StoreBrandingCard({ userId, studioName }: StoreBrandingCardProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_STORE_PRIMARY_COLOR);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_STORE_SECONDARY_COLOR);
  const [titleFont, setTitleFont] = useState(STORE_TITLE_FONTS[0].value);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [defaultProductionMessage, setDefaultProductionMessage] = useState("");

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase.from("store_settings").select("*").eq("user_id", userId).maybeSingle();
    const settings = data as StoreSettings | null;
    if (settings) {
      setLogoUrl(settings.logo_url);
      setPrimaryColor(settings.primary_color || DEFAULT_STORE_PRIMARY_COLOR);
      setSecondaryColor(settings.secondary_color || DEFAULT_STORE_SECONDARY_COLOR);
      setTitleFont(settings.title_font || STORE_TITLE_FONTS[0].value);
      setWhatsappNumber(settings.whatsapp_number || "");
      setWhatsappMessage(settings.whatsapp_default_message || "");
      setDefaultProductionMessage(settings.default_production_message || "");
    }
    setLoading(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setError(null);

    const ext = file.name.split(".").pop();
    const path = `${userId}/store-logo.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploadingLogo(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: saveError } = await supabase.from("store_settings").upsert({
      user_id: userId,
      logo_url: logoUrl ? logoUrl.split("?")[0] : null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      title_font: titleFont,
      whatsapp_number: whatsappNumber.trim() || null,
      whatsapp_default_message: whatsappMessage.trim() || null,
      default_production_message: defaultProductionMessage.trim() || null,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fontOption = getStoreFont(titleFont);

  if (loading) {
    return (
      <GlassCard padding="lg" className="flex justify-center py-10 text-text-muted">
        <Loader2 size={20} className="animate-spin" />
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="lg" className="space-y-5">
      <div>
        <h3 className="font-display text-lg">Identidade Visual e WhatsApp</h3>
        <p className="text-sm text-text-secondary">
          Logo, cores e fonte de título aparecem só na sua loja pública — não afetam o painel.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border-glass bg-white/[0.03]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-text-muted">
                  <Camera size={18} />
                </div>
              )}
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 text-transparent transition-colors hover:bg-black/40 hover:text-white">
                {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            <div>
              <p className="text-sm text-text-primary">Logotipo da loja</p>
              <p className="text-[11px] text-text-muted">Clique na imagem pra trocar. Se não enviar, usa a foto do perfil do estúdio.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-text-muted">Cor de destaque</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border-glass bg-transparent"
                />
                <input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="glass-input w-full"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-muted">Cor de fundo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border-glass bg-transparent"
                />
                <input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="glass-input w-full"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Fonte de título</label>
            <select value={titleFont} onChange={(e) => setTitleFont(e.target.value)} className="glass-input w-full">
              {STORE_TITLE_FONTS.map((f) => (
                <option key={f.value} value={f.value} className="bg-bg-raised">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-text-muted">WhatsApp da loja</label>
              <input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="glass-input w-full"
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-text-muted">Mensagem padrão</label>
              <input
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                className="glass-input w-full"
                placeholder="Olá! Tenho uma dúvida sobre a loja."
              />
            </div>
          </div>
          <p className="text-[11px] text-text-muted">
            Sem número cadastrado, o botão de WhatsApp não aparece na loja.
          </p>

          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Prazo de produção padrão</label>
            <input
              value={defaultProductionMessage}
              onChange={(e) => setDefaultProductionMessage(e.target.value)}
              className="glass-input w-full"
              placeholder="Ex: Consulte o prazo com a loja"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              Exibido quando um produto não tem prazo de produção configurado.
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <NeonButton onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Identidade Visual"}
          </NeonButton>
          {saved && <p className="text-xs text-neon-green">Salvo com sucesso!</p>}
        </div>

        {/* Preview ao vivo do topo da loja */}
        <div>
          <p className="mb-2 text-xs text-text-muted">Preview do topo da loja</p>
          <div
            className="overflow-hidden rounded-xl border border-border-glass"
            style={{ backgroundColor: secondaryColor }}
          >
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <StoreIcon size={16} color={primaryColor} />
                  )}
                </div>
                <span style={{ fontFamily: fontOption.cssFamily, color: "#FFFFFF" }} className="text-base">
                  {studioName || "Sua Loja"}
                </span>
              </div>
              <div className="h-8 w-8 rounded-full border border-white/20" />
            </div>
            <div className="px-5 pb-6">
              <p style={{ fontFamily: fontOption.cssFamily, color: "#FFFFFF" }} className="text-xl">
                {studioName || "Sua Loja"}
              </p>
              <div className="mt-4 inline-block rounded-full px-4 py-2 text-xs font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                Adicionar ao carrinho
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
