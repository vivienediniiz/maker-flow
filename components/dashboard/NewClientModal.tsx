"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";

export function NewClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (client: { name: string; phone: string; email: string }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreated?.({ name, phone, email });
    setName("");
    setPhone("");
    setEmail("");
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
        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit">Salvar Cliente</NeonButton>
        </div>
      </form>
    </Modal>
  );
}
