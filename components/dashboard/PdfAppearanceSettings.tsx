"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NeonButton } from "@/components/ui/NeonButton";
import { Toggle } from "@/components/ui/Toggle";
import { Loader2, Save } from "lucide-react";

const DEFAULT_ACCENT = "#FF4EDF";

export function PdfAppearanceSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [footerMessage, setFooterMessage] = useState("");
  const [showProductionDeadline, setShowProductionDeadline] = useState(true);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: settings }, { data: profile }] = await Promise.all([
      supabase
        .from("settings")
        .select("pdf_accent_color, pdf_footer_message, pdf_show_production_deadline")
        .eq("user_id", user.id)
        .single(),
      supabase.from("profiles").select("avatar_url").eq("id", user.id).single(),
    ]);

    setAccentColor(settings?.pdf_accent_color || DEFAULT_ACCENT);
    setFooterMessage(settings?.pdf_footer_message ?? "");
    setShowProductionDeadline(settings?.pdf_show_production_deadline ?? true);
    setAvatarUrl(profile?.avatar_url ?? null);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    await supabase
      .from("settings")
      .update({
        pdf_accent_color: accentColor || null,
        pdf_footer_message: footerMessage.trim() || null,
        pdf_show_production_deadline: showProductionDeadline,
      })
      .eq("user_id", user.id);

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4 text-text-muted">
        <Loader2 size={16} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs text-text-muted">Logo do estúdio</span>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neon-gradient">
              {avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Logo do estúdio" className="h-full w-full object-cover" />
              )}
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-account-modal"))}
              className="text-xs text-neon-pink hover:underline"
            >
              Trocar em Minha Conta
            </button>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs text-text-muted">Cor de destaque</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-border-glass bg-transparent"
            />
            <input
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="glass-input w-full"
              placeholder={DEFAULT_ACCENT}
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs text-text-muted">Mensagem de rodapé (opcional)</span>
          <textarea
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            rows={2}
            className="glass-input w-full resize-none"
            placeholder="Ex: Obrigado pela preferência!"
          />
        </div>

        <Toggle
          checked={showProductionDeadline}
          onChange={setShowProductionDeadline}
          label="Mostrar prazo de produção no PDF"
        />

        <NeonButton type="button" size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? "Salvando..." : "Salvar aparência"}
        </NeonButton>
      </div>

      {/* Preview estático — não é o PDF real, só uma prévia das escolhas de cor/logo/rodapé */}
      <div>
        <span className="mb-1.5 block text-xs text-text-muted">Prévia</span>
        <div className="overflow-hidden rounded-xl border border-border-glass bg-white text-[#1A1625] shadow-neon-glow">
          <div className="flex items-center gap-3 border-b-[3px] px-5 py-4" style={{ borderColor: accentColor }}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#E86333] via-[#FF4EDF] to-[#AA17DB]">
              {avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">Meu Estúdio</p>
              <p className="text-[10px] font-semibold" style={{ color: accentColor }}>
                ORÇAMENTO DE IMPRESSÃO 3D
              </p>
            </div>
          </div>
          <div className="space-y-2 px-5 py-4 text-[11px] text-[#3A3548]">
            <div className="flex justify-between">
              <span>Vaso decorativo</span>
              <span className="font-semibold">R$ 45,00</span>
            </div>
            {showProductionDeadline && (
              <div className="flex justify-between text-[#726C85]">
                <span>Prazo de Produção</span>
                <span>5 dias úteis</span>
              </div>
            )}
          </div>
          {footerMessage && (
            <div className="border-t border-[#EEE6F2] px-5 py-3 text-center text-[10px] text-[#B4AFC4]">
              {footerMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
