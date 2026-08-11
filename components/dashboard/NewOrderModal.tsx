"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import type { Client } from "@/lib/types";

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  finalPrice: number;
  onCreated?: () => void;
}

export function NewOrderModal({ open, onClose, projectName, finalPrice, onCreated }: NewOrderModalProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<"select" | "new">("select");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadClients();
    setMode("select");
    setSelectedClientId("");
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setError(null);
  }, [open]);

  async function loadClients() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("clients").select("*").eq("user_id", user.id).order("name");
    setClients((data as Client[]) ?? []);
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

    let clientId = selectedClientId;

    if (mode === "new") {
      if (!newName.trim()) {
        setError("Informe o nome do cliente.");
        setSaving(false);
        return;
      }
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({ user_id: user.id, name: newName, phone: newPhone || null, email: newEmail || null })
        .select()
        .single();

      if (clientError || !newClient) {
        setError(clientError?.message ?? "Falha ao criar cliente.");
        setSaving(false);
        return;
      }
      clientId = newClient.id;
    }

    if (!clientId) {
      setError("Selecione ou cadastre um cliente.");
      setSaving(false);
      return;
    }

    // Entra direto na aba Pedidos já como "Pago" — é um projeto que o cliente
    // já confirmou/pagou na hora, diferente do fluxo de Gerar Orçamento (que
    // entra como "Orçamento Enviado" e pode expirar em 15 dias).
    const { error: quoteError } = await supabase.from("quotes").insert({
      user_id: user.id,
      project_name: projectName || "Projeto sem nome",
      weight_g: 0,
      print_time_min: 0,
      energy_cost: 0,
      filament_cost: 0,
      margin_percent: 0,
      final_price: finalPrice,
      client_id: clientId,
      status: "paid",
    });

    setSaving(false);

    if (quoteError) {
      setError(quoteError.message);
      return;
    }

    onCreated?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Iniciar Projeto / Criar Pedido">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">{projectName || "Projeto sem nome"}</p>
            <p className="text-xs text-text-muted">Entra em Pedidos já como Pago</p>
          </div>
          <span className="neon-text font-numeric text-lg font-semibold">{formatBRL(finalPrice)}</span>
        </div>

        <div className="glass-card flex gap-1 p-1">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={`flex-1 rounded-pill py-2 text-xs font-medium transition-colors ${
              mode === "select" ? "bg-neon-gradient text-white" : "text-text-secondary"
            }`}
          >
            Cliente existente
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 rounded-pill py-2 text-xs font-medium transition-colors ${
              mode === "new" ? "bg-neon-gradient text-white" : "text-text-secondary"
            }`}
          >
            Novo cliente
          </button>
        </div>

        {mode === "select" ? (
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="glass-input w-full"
          >
            <option value="" className="bg-bg-raised">
              {clients.length === 0 ? "Nenhum cliente cadastrado" : "Selecione..."}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-bg-raised">
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-3">
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="glass-input w-full"
              placeholder="Nome completo"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="glass-input w-full"
                placeholder="WhatsApp"
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="glass-input w-full"
                placeholder="E-mail"
              />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Criar Pedido"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}