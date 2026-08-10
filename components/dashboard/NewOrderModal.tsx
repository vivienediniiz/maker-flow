"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { formatBRL } from "@/lib/utils";

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  finalPrice: number;
  onConfirm?: (data: { clientName: string; channel: string; deadline: string }) => void;
}

const CHANNELS = [
  { value: "site", label: "Site" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "marketplace", label: "Marketplace" },
  { value: "presencial", label: "Presencial" },
];

export function NewOrderModal({
  open,
  onClose,
  projectName,
  finalPrice,
  onConfirm,
}: NewOrderModalProps) {
  const [clientName, setClientName] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [deadline, setDeadline] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm?.({ clientName, channel, deadline });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Iniciar Projeto / Criar Pedido">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">{projectName || "Projeto sem nome"}</p>
            <p className="text-xs text-text-muted">Orçamento gerado na calculadora</p>
          </div>
          <span className="neon-text font-numeric text-lg font-semibold">{formatBRL(finalPrice)}</span>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Cliente</label>
          <input
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="glass-input w-full"
            placeholder="Nome do cliente"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Canal</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="glass-input w-full"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value} className="bg-bg-raised">
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Prazo de entrega</label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="glass-input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit">Criar Pedido</NeonButton>
        </div>
      </form>
    </Modal>
  );
}
