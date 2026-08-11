"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/lib/types";

export function NewClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (client: Client) => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Sessão expirada — faça login de novo.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onCreated?.(data as Client);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Cliente">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome completo</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Ana Beatriz Costa"
          />
        </div>
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
          <label className="mb-1.5 block text-xs text-text-muted">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input w-full"
            placeholder="cliente@email.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Endereço</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="glass-input w-full"
            placeholder="Rua, número, cidade — UF"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="glass-input w-full resize-none"
            placeholder="Preferências, histórico, etc."
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Cliente"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}