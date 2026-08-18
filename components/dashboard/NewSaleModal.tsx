"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { createClient } from "@/lib/supabase/client";
import { formatBRL } from "@/lib/utils";
import { buildPriceTierRanges } from "@/lib/priceTiers";
import type { Client, Product, QuoteWithClient, QuotePaymentMethod, QuoteChannel } from "@/lib/types";
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
  /** Quando presente, o modal edita essa venda em vez de criar uma nova. */
  quote?: QuoteWithClient | null;
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
  quote = null,
  onCreated,
}: NewSaleModalProps) {
  const supabase = createClient();
  const isEditing = !!quote;
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
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  // "" = produto sem faixas (não se aplica); "custom" = valor customizado pra
  // essa venda; string numérica = índice da faixa escolhida em product.price_tiers.
  const [tierChoice, setTierChoice] = useState("");
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
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setError(null);

    if (quote) {
      setSelectedClientId(quote.client_id ?? "");
      setProductMode(quote.product_id ? "select" : "new");
      setSelectedProductId(quote.product_id ?? "");
      setProjectName(quote.project_name);
      setFinalPrice(String(quote.final_price.toFixed(2)));
      // Sempre recarrega em modo "custom": reproduz o valor exato da venda
      // já salva, sem depender de as faixas do produto ainda serem as mesmas.
      setQuantity(quote.quantity != null ? String(quote.quantity) : "1");
      setUnitPrice(quote.unit_price != null ? String(quote.unit_price.toFixed(2)) : "");
      setTierChoice(quote.product_id ? "custom" : "");
      setPaymentMethod(quote.payment_method ?? "pix");
      setChannel(quote.channel ?? "whatsapp");
      setShippingCost(quote.shipping_cost != null ? String(quote.shipping_cost) : "");
      setDestinationCep(quote.destination_cep ?? "");
    } else {
      setSelectedClientId("");
      setProductMode("new");
      setSelectedProductId("");
      setProjectName(initialProjectName);
      setFinalPrice(initialFinalPrice != null ? String(initialFinalPrice.toFixed(2)) : "");
      setQuantity("1");
      setUnitPrice("");
      setTierChoice("");
      setPaymentMethod("pix");
      setChannel("whatsapp");
      setShippingCost("");
      setDestinationCep("");
    }
  }, [open, quote, initialProjectName, initialFinalPrice]);

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
      setUnitPrice(String(product.sale_price.toFixed(2)));
      setQuantity("1");
      // Preço da faixa (product.sale_price) por padrão não corresponde a
      // nenhuma faixa específica — fica em "custom" até o usuário escolher uma.
      setTierChoice(product.price_tiers.length > 0 ? "custom" : "");
    }
  }

  function handleTierChange(value: string, tierRanges: ReturnType<typeof buildPriceTierRanges>) {
    setTierChoice(value);
    if (value === "custom") return;
    const tier = tierRanges.find((r) => String(r.originalIndex) === value);
    if (tier) setUnitPrice(tier.price.toFixed(2));
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const showUnitPricing = productMode === "select" && !!selectedProduct;
  const tierRanges = selectedProduct ? buildPriceTierRanges(selectedProduct.price_tiers) : [];
  const unitPriceLocked = tierRanges.length > 0 && tierChoice !== "custom" && tierChoice !== "";
  const computedTotal = showUnitPricing
    ? (Number(unitPrice) || 0) * (Number(quantity) || 0)
    : Number(finalPrice) || 0;

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

    if (showUnitPricing) {
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        setError("Quantidade deve ser um número inteiro de pelo menos 1.");
        return;
      }
      if (!unitPrice || Number(unitPrice) <= 0) {
        setError("Informe um valor unitário válido.");
        return;
      }
    } else if (!finalPrice || Number(finalPrice) <= 0) {
      setError("Informe um valor final válido.");
      return;
    }

    const price = computedTotal;

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

    const appliedTierLabel =
      showUnitPricing && tierChoice !== "custom" && tierChoice !== ""
        ? tierRanges.find((r) => String(r.originalIndex) === tierChoice)?.label ?? null
        : null;

    const sharedPayload = {
      project_name: projectName || "Projeto sem nome",
      final_price: price,
      client_id: clientId,
      product_id: productMode === "select" && selectedProductId ? selectedProductId : null,
      payment_method: paymentMethod,
      channel,
      shipping_cost: shippingCost ? Number(shippingCost) : null,
      destination_cep: destinationCep || null,
      quantity: showUnitPricing ? Number(quantity) : null,
      unit_price: showUnitPricing ? Number(unitPrice) : null,
      price_tier_label: appliedTierLabel,
    };

    const { error: quoteError } = isEditing
      ? await supabase.from("quotes").update(sharedPayload).eq("id", quote!.id)
      : await supabase.from("quotes").insert({
          ...sharedPayload,
          user_id: user.id,
          weight_g: weightG,
          print_time_min: printTimeMin,
          energy_cost: energyCost,
          filament_cost: filamentCost,
          margin_percent: marginPercent,
          status: "paid",
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
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar Venda" : "Nova Venda Manual"}>
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

        {showUnitPricing ? (
          <>
            {tierRanges.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-text-muted">Faixa de Preço</label>
                  {unitPriceLocked && (
                    <button
                      type="button"
                      onClick={() => setTierChoice("custom")}
                      className="flex items-center gap-1 text-[11px] text-neon-pink hover:underline"
                    >
                      <Pencil size={11} /> Editar valor
                    </button>
                  )}
                </div>
                <select
                  value={tierChoice}
                  onChange={(e) => handleTierChange(e.target.value, tierRanges)}
                  className="glass-input w-full"
                >
                  {tierRanges.map((r) => (
                    <option key={r.originalIndex} value={r.originalIndex} className="bg-bg-raised">
                      {r.label}
                    </option>
                  ))}
                  <option value="custom" className="bg-bg-raised">
                    Personalizado
                  </option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Valor Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => {
                    setUnitPrice(e.target.value);
                    setTierChoice("custom");
                  }}
                  disabled={unitPriceLocked}
                  className={`glass-input w-full ${unitPriceLocked ? "cursor-not-allowed opacity-60" : ""}`}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Quantidade</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="glass-input w-full"
                />
              </div>
            </div>

            <div className="glass-card flex items-center justify-between px-4 py-3">
              <span className="text-xs text-text-muted">Valor Total</span>
              <span className="neon-text font-numeric text-lg font-semibold">{formatBRL(computedTotal)}</span>
            </div>
          </>
        ) : (
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
        )}

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

        {!isEditing && <p className="text-[11px] text-text-muted">Entra em Vendas já como Pago.</p>}

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

        {!showUnitPricing && finalPrice && !isNaN(Number(finalPrice)) && (
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
            {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Venda"}
          </NeonButton>
        </div>
      </form>
    </Modal>
  );
}
