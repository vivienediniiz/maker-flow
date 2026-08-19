"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatCep, cepDigits, fetchAddressByCep } from "@/lib/viaCep";
import type { Client } from "@/lib/types";

/** Monta a versão em texto livre a partir dos campos estruturados, pra manter `address` sincronizado com o que as outras telas ainda leem direto. */
function buildLegacyAddress(fields: {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}): string {
  const line1 = [fields.street, fields.number].filter(Boolean).join(", ");
  const line1Full = fields.complement ? `${line1} - ${fields.complement}` : line1;
  const line2 = [fields.neighborhood, fields.city && fields.state ? `${fields.city} - ${fields.state}` : fields.city || fields.state]
    .filter(Boolean)
    .join(", ");
  return [line1Full, line2].filter(Boolean).join(", ");
}

export function NewClientModal({
  open,
  onClose,
  onCreated,
  client = null,
  zIndexClass,
  maxWidthClass,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (client: Client) => void;
  /** Quando presente, o modal edita esse cliente em vez de criar um novo. */
  client?: Client | null;
  /** Pra empilhar por cima de outro modal já aberto (ex: Nova Venda Manual). */
  zIndexClass?: string;
  maxWidthClass?: string;
}) {
  const supabase = createClient();
  const isEditing = !!client;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [notes, setNotes] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? "");
    setPhone(client?.phone ?? "");
    setEmail(client?.email ?? "");
    setInstagram(client?.instagram ?? "");
    setNotes(client?.notes ?? "");
    setCep(client?.cep ?? "");
    setStreet(client?.street ?? "");
    setNumber(client?.number ?? "");
    setComplement(client?.complement ?? "");
    setNeighborhood(client?.neighborhood ?? "");
    setCity(client?.city ?? "");
    setState(client?.state ?? "");
    setCepError(null);
    setError(null);
  }, [open, client]);

  async function handleCepChange(raw: string) {
    const formatted = formatCep(raw);
    setCep(formatted);
    setCepError(null);

    if (cepDigits(formatted).length !== 8) return;

    setCepLoading(true);
    try {
      const address = await fetchAddressByCep(formatted);
      if (!address) {
        setCepError("CEP não encontrado");
      } else {
        setStreet(address.street);
        setNeighborhood(address.neighborhood);
        setCity(address.city);
        setState(address.state);
      }
    } catch {
      setCepError("Falha ao consultar o CEP — tente de novo.");
    } finally {
      setCepLoading(false);
    }
  }

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

    const legacyAddress = buildLegacyAddress({ street, number, complement, neighborhood, city, state });

    const payload = {
      name,
      phone: phone || null,
      email: email || null,
      instagram: instagram ? instagram.trim().replace(/^@/, "") : null,
      notes: notes || null,
      cep: cep || null,
      street: street || null,
      number: number || null,
      complement: complement || null,
      neighborhood: neighborhood || null,
      city: city || null,
      state: state || null,
      // Mantém address sincronizado com os campos estruturados sempre que
      // pelo menos um deles é preenchido; se nenhum for, cai pro address
      // que já existia (não apaga um endereço antigo em texto livre à toa).
      ...(legacyAddress ? { address: legacyAddress } : {}),
    };

    const { data, error: dbError } = isEditing
      ? await supabase.from("clients").update(payload).eq("id", client!.id).select().single()
      : await supabase
          .from("clients")
          .insert({ ...payload, user_id: user.id })
          .select()
          .single();

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onCreated?.(data as Client);
    onClose();
  }

  const showLegacyAddressHint = isEditing && client?.address && !client?.street;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Cliente" : "Novo Cliente"}
      zIndexClass={zIndexClass}
      maxWidthClass={maxWidthClass}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto scrollbar-glass pr-1">
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
          <label className="mb-1.5 block text-xs text-text-muted">Instagram</label>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="glass-input w-full"
            placeholder="@perfil_do_cliente"
          />
        </div>

        {showLegacyAddressHint && (
          <p className="rounded-lg border border-border-glass bg-white/[0.02] px-3 py-2 text-[11px] text-text-muted">
            Endereço cadastrado antes (texto livre): <span className="text-text-secondary">{client!.address}</span>
            <br />
            Preencha os campos abaixo pra estruturar o endereço deste cliente.
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">CEP</label>
          <div className="relative">
            <input
              value={cep}
              onChange={(e) => handleCepChange(e.target.value)}
              className="glass-input w-full pr-9"
              placeholder="00000-000"
              inputMode="numeric"
              maxLength={9}
            />
            {cepLoading && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-text-muted" />
            )}
          </div>
          {cepError && <p className="mt-1 text-[11px] text-red-400">{cepError}</p>}
        </div>

        <div className="grid grid-cols-[1fr_100px] gap-3 sm:grid-cols-[1fr_120px]">
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs text-text-muted">Rua</label>
            <input value={street} onChange={(e) => setStreet(e.target.value)} className="glass-input w-full" placeholder="Rua/Logradouro" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Número</label>
            <input value={number} onChange={(e) => setNumber(e.target.value)} className="glass-input w-full" placeholder="Nº" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Complemento</label>
            <input
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
              className="glass-input w-full"
              placeholder="Apto, bloco... (opcional)"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Bairro</label>
            <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="glass-input w-full" />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_80px] gap-3 sm:grid-cols-[1fr_90px]">
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs text-text-muted">Cidade</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="glass-input w-full" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">UF</label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              className="glass-input w-full"
              placeholder="SP"
              maxLength={2}
            />
          </div>
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
            {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Salvar Cliente"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
