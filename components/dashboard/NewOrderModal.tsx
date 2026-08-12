"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import type { Client, QuotePaymentMethod } from "@/lib/types";

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  // Opcionais: quando vem da Calculadora, já chegam preenchidos.
  // Quando aberto direto da aba Pedidos, ficam vazios e editáveis no modal.
  initialProjectName?: string;
  initialFinalPrice?: number;
  weightG?: number;
  printTimeMin?: number;
  energyCost?: number;
  filamentCost?: number;
  marginPercent?: number;
  onCreated?: () => void;
}

const PAYMENT_METHODS: { value: QuotePaymentMethod; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

export function NewOrderModal({
  open,
  onClose,
  initialProjectName = "",
  initialFinalPrice,
  weightG = 0,
  printTimeMin = 0,
  energyCost = 0,
  filamentCost = 0,
  marginPercent = 0,
  onCreated,
}: NewOrderModalProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<"select" | "new">("select");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [projectName, setProjectName] = useState(initialProjectName);
  const [finalPrice, setFinalPrice] = useState(initialFinalPrice != null ? String(initialFinalPrice.toFixed(2)) : "");
  const [paymentMethod, setPaymentMethod] = useState<QuotePaymentMethod>("pix");
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
    setProjectName(initialProjectName);
    setFinalPrice(initialFinalPrice != null ? String(initialFinalPrice.toFixed(2)) : "");
    setPaymentMethod("pix");
    setError(null);
  }, [open, initialProjectName, initialFinalPrice]);

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
    setError(null);

    if (!projectName.trim()) {
      setError("Informe o nome do produto/projeto.");
      return;
    }
    const price = Number(finalPrice);
    if (!price || price <= 0) {
      setError("Informe um valor final válido.");
      return;
    }

    setSaving(true);

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

    const { error: quoteError } = await supabase.from("quotes").insert({
      user_id: user.id,
      project_name: projectName || "Projeto sem nome",
      weight_g: weightG,
      print_time_min: printTimeMin,
      energy_cost: energyCost,
      filament_cost: filamentCost,
      margin_percent: marginPercent,
      final_price: price,
      client_id: clientId,
      status: "paid",
      payment_method: paymentMethod,
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
    <Modal open={open} onClose={onClose} title="Criar Pedido">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Nome do produto / projeto</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: Chaveiro personalizado"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Valor final (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="glass-input w-full"
              placeholder="0,00"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Forma de pagamento</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as QuotePaymentMethod)}
              className="glass-input w-full"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.value} value={pm.value} className="bg-bg-raised">
                  {pm.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-text-muted">Entra em Pedidos já como Pago.</p>

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

        {finalPrice && !isNaN(Number(finalPrice)) && (
          <div className="glass-card flex items-center justify-between px-4 py-3">
            <span className="text-xs text-text-muted">Valor</span>
            <span className="neon-text font-numeric text-lg font-semibold">{formatBRL(Number(finalPrice))}</span>
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