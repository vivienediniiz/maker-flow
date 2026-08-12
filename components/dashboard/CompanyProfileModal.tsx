"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface CompanyProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: Partial<Profile>) => void;
}

export function CompanyProfileModal({ open, onClose, onSaved }: CompanyProfileModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [studioName, setStudioName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [document, setDocument] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [state, setState] = useState("");
  const [complement, setComplement] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    loadProfile();
  }, [open]);

  async function loadProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select(
        "full_name, studio_name, phone, document, cep, street, street_number, state, complement, address, instagram, website, bio, avatar_url"
      )
      .eq("id", user.id)
      .single();

    if (data) {
      setFullName(data.full_name ?? "");
      setStudioName(data.studio_name ?? "");
      setPhone(data.phone ?? "");
      setDocument(data.document ?? "");
      setCep(data.cep ?? "");
      setStreet(data.street ?? "");
      setStreetNumber(data.street_number ?? "");
      setState(data.state ?? "");
      setComplement(data.complement ?? "");
      setInstagram(data.instagram ?? "");
      setWebsite(data.website ?? "");
      setBio(data.bio ?? "");
      setAvatarUrl(data.avatar_url ?? null);

      if (!data.street && !data.street_number && data.address) {
        const addressText = typeof data.address === "string" ? data.address : "";
        const parsedAddress = addressText
          .split(",")
          .map((part: string) => part.trim())
          .filter((part): part is string => Boolean(part));

        if (parsedAddress.length > 0) setStreet(parsedAddress[0]);
        if (parsedAddress.length > 1) setStreetNumber(parsedAddress[1]);
      }
    }
    setLoading(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploadingAvatar(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploadingAvatar(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const avatarUrlToSave = avatarUrl ? avatarUrl.split("?")[0] : null;
    const officialAddress = [street, streetNumber, complement, state].filter(Boolean).join(", ");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        studio_name: studioName || null,
        phone: phone || null,
        document: document || null,
        cep: cep || null,
        street: street || null,
        street_number: streetNumber || null,
        state: state || null,
        complement: complement || null,
        address: officialAddress || null,
        instagram: instagram || null,
        website: website || null,
        bio: bio || null,
        avatar_url: avatarUrlToSave,
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    onSaved?.({
      full_name: fullName,
      studio_name: studioName,
      avatar_url: avatarUrlToSave,
    });
    setTimeout(() => setSuccess(false), 2000);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMessage("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordSaving(false);
    if (error) {
      setPasswordMessage(error.message);
      return;
    }
    setPasswordMessage("Senha atualizada com sucesso.");
    setNewPassword("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Perfil do Estúdio">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-neon-pink" />
        </div>
      ) : (
        <div className="max-h-[70vh] space-y-6 overflow-y-auto scrollbar-glass pr-1">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-neon-gradient">
                {avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Logo do estúdio" className="h-full w-full object-cover" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border-glass bg-bg-raised text-text-secondary hover:text-text-primary">
                {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <p className="text-xs text-text-muted">Logo ou foto do estúdio</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Nome do estúdio</label>
                <input
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Ex: Studio Maker 3D"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Seu nome</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="glass-input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">WhatsApp</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="glass-input w-full"
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">CNPJ / CPF</label>
                <input
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  className="glass-input w-full"
                  placeholder="00.000.000/0001-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">CEP</label>
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="glass-input w-full"
                  placeholder="00000-000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Estado</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="glass-input w-full"
                  placeholder="SP"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Rua</label>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="glass-input w-full"
                  placeholder="Rua das Flores"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Número</label>
                <input
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  className="glass-input w-full"
                  placeholder="123"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-text-muted">Complemento</label>
              <input
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="glass-input w-full"
                placeholder="Sala 01, bloco B"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Instagram</label>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="glass-input w-full"
                  placeholder="@seuestudio"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Site</label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="glass-input w-full"
                  placeholder="seuestudio.com.br"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-text-muted">Bio curta</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="glass-input w-full resize-none"
                placeholder="Aparece em PDFs de orçamento, por exemplo."
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            {success && <p className="text-xs text-neon-green">Salvo com sucesso!</p>}

            <NeonButton type="submit" className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar Perfil"}
            </NeonButton>
          </form>

          <div className="border-t border-border-glass pt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Segurança</p>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Nova senha</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              {passwordMessage && (
                <p className={`text-xs ${passwordMessage.includes("sucesso") ? "text-neon-green" : "text-red-400"}`}>
                  {passwordMessage}
                </p>
              )}
              <NeonButton type="submit" variant="outline" className="w-full" disabled={passwordSaving}>
                {passwordSaving ? "Atualizando..." : "Trocar Senha"}
              </NeonButton>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
}