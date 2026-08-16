"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import type { Client, Product, QuotePaymentMethod, QuoteChannel } from "@/lib/types";
import { QUOTE_CHANNEL_LABELS } from "@/lib/quotes";

interface NewSaleModalProps {
  open: boolean;
  onClose: () => void;
  // Opcionais: quando vem da Calculadora, já chegam preenchidos.
  // Quando aberto direto da aba Vendas, ficam vazios e editáveis no modal.
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

export function NewSaleModal({
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
}: NewSaleModalProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<"select" | "new">("select");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [productMode, setProductMode] = useState<"select" | "new">("new");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [projectName, setProjectName] = useState(initialProjectName);
  const [finalPrice, setFinalPrice] = useState(initialFinalPrice != null ? String(initialFinalPrice.toFixed(2)) : "");
  const [paymentMethod, setPaymentMethod] = useState<QuotePaymentMethod>("pix");
  const [channel, setChannel] = useState<QuoteChannel>("whatsapp");
  const [shippingCost, setShippingCost] = useState("");
  const [destinationCep, setDestinationCep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadClients();
    loadProducts();
    setMode("select");
    setSelectedClientId("");
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setProductMode("new");
    setSelectedProductId("");
    setProjectName(initialProjectName);
    setFinalPrice(initialFinalPrice != null ? String(initialFinalPrice.toFixed(2)) : "");
    setPaymentMethod("pix");
    setChannel("whatsapp");
    setShippingCost("");
    setDestinationCep("");
    setError(null);
  }, [open, initialProjectName, initialFinalPrice]);

  async function loadProducts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("name");
    setProducts((data as Product[]) ?? []);
  }

  function handleSelectProduct(productId: string) {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product) {
      setProjectName(product.name);
      setFinalPrice(String(product.sale_price.toFixed(2)));
    }
  }

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
      product_id: productMode === "select" && selectedProductId ? selectedProductId : null,
      status: "paid",
      payment_method: paymentMethod,
      channel,
      shipping_cost: shippingCost ? Number(shippingCost) : null,
      destination_cep: destinationCep || null,
      source: "manual",
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
    <Modal open={open} onClose={onClose} title="Nova Venda Manual">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Produto</label>
          <div className="glass-card mb-2 flex gap-1 p-1">
            <button
              type="button"
              onClick={() => setProductMode("select")}
              className={`flex-1 rounded-pill py-2 text-xs font-medium transition-colors ${
                productMode === "select" ? "bg-neon-gradient text-white" : "text-text-secondary"
              }`}
            >
              Produto já cadastrado
            </button>
            <button
              type="button"
              onClick={() => setProductMode("new")}
              className={`flex-1 rounded-pill py-2 text-xs font-medium transition-colors ${
                productMode === "new" ? "bg-neon-gradient text-white" : "text-text-secondary"
              }`}
            >
              Digitar produto
            </button>
          </div>

          {productMode === "select" ? (
            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="glass-input w-full"
            >
              <option value="" className="bg-bg-raised">
                {products.length === 0 ? "Nenhum produto cadastrado" : "Selecione..."}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id} className="bg-bg-raised">
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="glass-input w-full"
              placeholder="Ex: Chaveiro personalizado"
            />
          )}
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Canal de venda</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as QuoteChannel)}
              className="glass-input w-full"
            >
              {Object.entries(QUOTE_CHANNEL_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-bg-raised">
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Frete do destinatário (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="glass-input w-full"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">CEP de destino <span className="text-text-muted/60">(opcional, pro documento de envio)</span></label>
          <input
            value={destinationCep}
            onChange={(e) => setDestinationCep(e.target.value)}
            className="glass-input w-full"
            placeholder="00000-000"
          />
        </div>

        <p className="text-[11px] text-text-muted">Entra em Vendas já como Pago.</p>

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
            {saving ? "Salvando..." : "Criar Venda"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
