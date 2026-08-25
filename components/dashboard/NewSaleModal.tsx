"use client";

import { useEffect, useState } from "react";
import { Pencil, Truck, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { NeonButton } from "@/components/ui/NeonButton";
import { NewProductModal } from "@/components/dashboard/NewProductModal";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { ShippingQuoteWidget, type ShippingQuoteSelection } from "@/components/dashboard/ShippingQuoteWidget";
import { FilamentPickerDropdown } from "@/components/dashboard/FilamentPickerDropdown";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, cn } from "@/lib/utils";
import { buildPriceTierRanges } from "@/lib/priceTiers";
import type { Client, Product, QuoteWithClient, QuotePaymentMethod, QuoteChannel, Coupon, QuoteDiscountType, Filament, Supply } from "@/lib/types";
import { QUOTE_CHANNEL_LABELS } from "@/lib/quotes";
import { isCouponValid, computeCouponDiscount, getCouponStatusLabel } from "@/lib/coupons";

interface UsedFilamentRow {
  filamentId: string;
  quantityG: string;
}

interface UsedSupplyRow {
  supplyId: string;
  quantity: string;
}

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
  /** Quando vem da Calculadora com o filamento de cada mesa já selecionado lá, chegam pré-preenchidos (ainda editáveis). */
  initialUsedFilaments?: UsedFilamentRow[];
  /** Quando vem da Calculadora com insumos já selecionados lá, chegam pré-preenchidos (ainda editáveis). */
  initialUsedSupplies?: UsedSupplyRow[];
  /**
   * Produto já cadastrado/atualizado automaticamente pela Calculadora a partir
   * do cálculo — só vincula (`product_id`, pra aparecer no catálogo e nos
   * relatórios de produtos mais vendidos), sem entrar no modo de preço por
   * unidade/faixa: o valor total já calculado (`initialFinalPrice`) continua
   * sendo o preço da venda. Diferente de escolher um produto manualmente no
   * dropdown abaixo, que aciona esse modo (preço vem do cadastro do produto).
   */
  initialProductId?: string;
  /** Quando presente, o modal edita essa venda em vez de criar uma nova. */
  quote?: QuoteWithClient | null;
  /** Na criação, recebe a venda recém-criada (com joins) — usado pra abrir a tela de sucesso/comprovante. Na edição, é chamado sem argumento. */
  onCreated?: (createdQuote?: QuoteWithClient) => void;
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
  initialUsedFilaments,
  initialUsedSupplies,
  initialProductId,
  quote = null,
  onCreated,
}: NewSaleModalProps) {
  const supabase = createClient();
  const isEditing = !!quote;
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  /** Só true quando o produto foi escolhido explicitamente (dropdown ou "Cadastrar Produto" aqui dentro) — liga o modo de preço por unidade/faixa. Um `initialProductId` vindo da Calculadora só vincula, não liga esse modo. */
  const [useProductPricing, setUseProductPricing] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [projectName, setProjectName] = useState(initialProjectName);
  const [finalPrice, setFinalPrice] = useState(initialFinalPrice != null ? String(initialFinalPrice.toFixed(2)) : "");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  // Só relevante quando o produto tem price_tiers: qual dos dois jeitos de
  // precificar está ativo.
  const [priceMode, setPriceMode] = useState<"unit" | "tier">("unit");
  const [selectedTierIndex, setSelectedTierIndex] = useState<number | null>(null);
  // Destrava o campo Valor Unitário dentro do modo "tier" (via "Editar valor").
  const [tierPriceOverridden, setTierPriceOverridden] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<QuotePaymentMethod>("pix");
  const [channel, setChannel] = useState<QuoteChannel>("whatsapp");
  const [shippingQuoteOpen, setShippingQuoteOpen] = useState(false);
  const [shippingValue, setShippingValue] = useState<number | null>(null);
  const [shippingSummary, setShippingSummary] = useState<string | null>(null);
  const [shippingDestinationCep, setShippingDestinationCep] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<QuoteDiscountType>("fixed");
  const [discount, setDiscount] = useState("0");
  const [discountWarning, setDiscountWarning] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState("0");
  const [productionDeadline, setProductionDeadline] = useState("");
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [usedFilaments, setUsedFilaments] = useState<UsedFilamentRow[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [usedSupplies, setUsedSupplies] = useState<UsedSupplyRow[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  // Reflete em tempo real qual cupom está com reserva de uso ativa (via
  // apply_coupon/release_coupon) — nunca fica fora de sincronia com o banco
  // porque toda troca passa por switchCouponReservation antes de mudar aqui.
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadClients();
    loadProducts();
    loadCoupons();
    loadFilaments();
    loadSupplies();
    setUsedFilaments(
      !quote && initialUsedFilaments && initialUsedFilaments.length > 0
        ? initialUsedFilaments
        : [{ filamentId: "", quantityG: "" }]
    );
    setUsedSupplies(
      !quote && initialUsedSupplies && initialUsedSupplies.length > 0
        ? initialUsedSupplies
        : [{ supplyId: "", quantity: "" }]
    );
    setClientModalOpen(false);
    setProductModalOpen(false);
    setShippingQuoteOpen(false);
    setError(null);
    setCouponError(null);

    if (quote) {
      setSelectedClientId(quote.client_id ?? "");
      setSelectedProductId(quote.product_id ?? "");
      // Só reabre no modo preço-por-unidade se a venda salva de fato foi
      // criada assim — uma venda com produto vinculado mas preço final livre
      // (ex: veio da Calculadora) deve continuar mostrando o Valor Total.
      setUseProductPricing(!!quote.product_id && quote.unit_price != null);
      setProjectName(quote.project_name);
      setFinalPrice(String(quote.final_price.toFixed(2)));
      // Sempre recarrega em modo "unitário" com o valor exato salvo, sem
      // depender de as faixas do produto ainda serem as mesmas de quando a
      // venda foi criada.
      setQuantity(quote.quantity != null ? String(quote.quantity) : "1");
      setUnitPrice(quote.unit_price != null ? String(quote.unit_price.toFixed(2)) : "");
      setPriceMode("unit");
      setSelectedTierIndex(null);
      setTierPriceOverridden(false);
      setPaymentMethod(quote.payment_method ?? "pix");
      setChannel(quote.channel ?? "whatsapp");
      setShippingValue(quote.shipping_cost ?? null);
      setShippingSummary(null);
      setShippingDestinationCep(quote.destination_cep ?? null);
      setDiscountType(quote.discount_type ?? "fixed");
      setDiscount(quote.discount_amount != null ? String(quote.discount_amount.toFixed(2)) : "0");
      setDiscountWarning(null);
      setDiscountPercent(quote.discount_percent != null ? String(quote.discount_percent) : "0");
      setSelectedCouponId(quote.coupon_id ?? "");
      setProductionDeadline(quote.production_deadline ?? "");
    } else {
      setSelectedClientId("");
      setSelectedProductId(initialProductId ?? "");
      setUseProductPricing(false);
      setProjectName(initialProjectName);
      setFinalPrice(initialFinalPrice != null ? String(initialFinalPrice.toFixed(2)) : "");
      setQuantity("1");
      setUnitPrice("");
      setPriceMode("unit");
      setSelectedTierIndex(null);
      setTierPriceOverridden(false);
      setPaymentMethod("pix");
      setChannel("whatsapp");
      setShippingValue(null);
      setShippingSummary(null);
      setShippingDestinationCep(null);
      setDiscountType("fixed");
      setDiscount("0");
      setDiscountWarning(null);
      setDiscountPercent("0");
      setSelectedCouponId("");
      setProductionDeadline("");
    }
  }, [open, quote, initialProjectName, initialFinalPrice, initialUsedFilaments, initialUsedSupplies, initialProductId]);

  async function loadCoupons() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("coupons").select("*").eq("user_id", user.id).order("code");
    setCoupons((data as Coupon[]) ?? []);
  }

  async function loadFilaments() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("filaments").select("*").eq("user_id", user.id).order("material");
    setFilaments((data as Filament[]) ?? []);
  }

  function addUsedFilamentRow() {
    setUsedFilaments((prev) => [...prev, { filamentId: "", quantityG: "" }]);
  }

  function updateUsedFilamentRow(index: number, patch: Partial<UsedFilamentRow>) {
    setUsedFilaments((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeUsedFilamentRow(index: number) {
    setUsedFilaments((prev) => prev.filter((_, i) => i !== index));
  }

  async function loadSupplies() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("supplies").select("*").eq("user_id", user.id).order("name");
    setSupplies((data as Supply[]) ?? []);
  }

  function addUsedSupplyRow() {
    setUsedSupplies((prev) => [...prev, { supplyId: "", quantity: "" }]);
  }

  function updateUsedSupplyRow(index: number, patch: Partial<UsedSupplyRow>) {
    setUsedSupplies((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeUsedSupplyRow(index: number) {
    setUsedSupplies((prev) => prev.filter((_, i) => i !== index));
  }

  async function loadProducts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("name");
    setProducts((data as Product[]) ?? []);
  }

  async function loadClients() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("clients").select("*").eq("user_id", user.id).order("name");
    setClients((data as Client[]) ?? []);
  }

  /** Aplica um produto (já cadastrado ou recém-criado) aos campos de preço da venda. */
  function applyProduct(product: Product) {
    setSelectedProductId(product.id);
    setUseProductPricing(true);
    setProjectName(product.name);
    setUnitPrice(String(product.sale_price.toFixed(2)));
    setQuantity("1");
    setPriceMode("unit");
    setSelectedTierIndex(null);
    setTierPriceOverridden(false);
  }

  function handleSelectProduct(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) applyProduct(product);
    else {
      setSelectedProductId(productId);
      setUseProductPricing(false);
    }
  }

  function handleProductCreated(product: Product) {
    setProducts((prev) => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
    applyProduct(product);
    setProductModalOpen(false);
  }

  function handleClientCreated(client: Client) {
    setClients((prev) => [...prev, client].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedClientId(client.id);
    setClientModalOpen(false);
  }

  function handlePriceModeChange(nextMode: "unit" | "tier") {
    setPriceMode(nextMode);
    setTierPriceOverridden(false);
    if (nextMode === "tier") {
      setUnitPrice("");
      setSelectedTierIndex(null);
    } else if (selectedProduct) {
      setUnitPrice(String(selectedProduct.sale_price.toFixed(2)));
    }
  }

  function handleTierSelect(value: string, tierRanges: ReturnType<typeof buildPriceTierRanges>) {
    setTierPriceOverridden(false);
    if (value === "") {
      setSelectedTierIndex(null);
      setUnitPrice("");
      return;
    }
    const idx = Number(value);
    const tier = tierRanges.find((r) => r.originalIndex === idx);
    setSelectedTierIndex(idx);
    if (tier) setUnitPrice(tier.price.toFixed(2));
  }

  function handleShippingSelected(sel: ShippingQuoteSelection) {
    setShippingValue(sel.price);
    setShippingSummary(`${sel.company} · ${sel.service}`);
    setShippingDestinationCep(sel.destinationCep);
  }

  /**
   * Troca a reserva de uso ativa (via RPCs apply_coupon/release_coupon) do
   * cupom hoje selecionado pra `nextCouponId`. Libera o antigo antes de
   * aplicar o novo, então `selectedCouponId` nunca fica fora de sincronia
   * com a reserva de verdade no banco — inclusive o cupom já salvo numa
   * venda em edição, que conta como "reservado" desde a abertura do modal.
   */
  async function switchCouponReservation(nextCouponId: string | null, orderValue: number) {
    const current = selectedCouponId || null;
    if (nextCouponId === current) return;
    setCouponError(null);
    setCouponBusy(true);

    if (current) {
      await supabase.rpc("release_coupon", { p_coupon_id: current });
    }

    if (nextCouponId) {
      const { data, error: rpcError } = await supabase.rpc("apply_coupon", {
        p_coupon_id: nextCouponId,
        p_order_value: orderValue,
      });
      if (rpcError) {
        setCouponError("Cupom inválido, expirado, esgotado ou abaixo do pedido mínimo.");
        setSelectedCouponId("");
        loadCoupons();
        setCouponBusy(false);
        return;
      }
      setCoupons((prev) => prev.map((c) => (c.id === nextCouponId ? (data as Coupon) : c)));
    }

    setSelectedCouponId(nextCouponId ?? "");
    setCouponBusy(false);
  }

  function handleDiscountTypeChange(nextType: QuoteDiscountType) {
    if (discountType === "coupon" && nextType !== "coupon") {
      switchCouponReservation(null, productValue);
    }
    setDiscountType(nextType);
    setDiscount("0");
    setDiscountWarning(null);
    setDiscountPercent("0");
  }

  /**
   * Fecha o modal desfazendo qualquer reserva de cupom feita nesta sessão
   * que ainda não foi salva — restaura pro cupom que já estava salvo na
   * venda (ou nenhum, em modo criação), pra não deixar reserva "presa".
   */
  async function handleClose() {
    const initialCouponId = quote?.coupon_id ?? null;
    const current = selectedCouponId || null;
    if (current !== initialCouponId) {
      if (current) await supabase.rpc("release_coupon", { p_coupon_id: current });
      if (initialCouponId) await supabase.rpc("apply_coupon", { p_coupon_id: initialCouponId, p_order_value: quote?.final_price ?? 0 });
    }
    onClose();
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const showUnitPricing = useProductPricing && !!selectedProduct;
  const tierRanges = selectedProduct ? buildPriceTierRanges(selectedProduct.price_tiers) : [];
  const hasTiers = tierRanges.length > 0;
  const unitPriceLocked = priceMode === "tier" && !tierPriceOverridden;
  const productValue = showUnitPricing
    ? (Number(unitPrice) || 0) * (Number(quantity) || 0)
    : Number(finalPrice) || 0;
  const shippingAmount = shippingValue ?? 0;
  const maxDiscount = productValue + shippingAmount;
  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId) ?? null;
  // No dropdown só entram cupons válidos agora, mas o que já está
  // selecionado continua visível mesmo se tiver ficado inválido nesse meio
  // tempo (ex: esgotou depois que a venda foi criada).
  const availableCoupons = coupons.filter((c) => isCouponValid(c, productValue) || c.id === selectedCouponId);
  const discountAmount =
    discountType === "fixed"
      ? Math.min(Number(discount) || 0, maxDiscount)
      : discountType === "percentage"
        ? (productValue * Math.min(Math.max(Number(discountPercent) || 0, 0), 100)) / 100
        : selectedCoupon
          ? computeCouponDiscount(selectedCoupon, productValue)
          : 0;
  const computedTotal = productValue + shippingAmount - discountAmount;
  // Custo do item vendido — só existe base de cálculo quando há produto
  // vinculado (o fluxo "Valor final" manual, sem produto, não tem custo conhecido).
  const costAmount = showUnitPricing && selectedProduct ? selectedProduct.cost_price * (Number(quantity) || 0) : 0;
  const estimatedProfit = productValue - costAmount;

  function handleDiscountChange(raw: string) {
    const value = Number(raw);
    if (raw !== "" && !isNaN(value) && value > maxDiscount) {
      setDiscount(maxDiscount.toFixed(2));
      setDiscountWarning("Desconto ajustado para o valor máximo permitido (não pode deixar o total negativo).");
      return;
    }
    setDiscountWarning(null);
    setDiscount(raw);
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

    if (!selectedClientId) {
      setError("Selecione ou cadastre um cliente.");
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

    const appliedTierLabel =
      showUnitPricing && priceMode === "tier" && selectedTierIndex !== null && !tierPriceOverridden
        ? tierRanges.find((r) => r.originalIndex === selectedTierIndex)?.label ?? null
        : null;

    const sharedPayload = {
      project_name: projectName || "Projeto sem nome",
      final_price: computedTotal,
      client_id: selectedClientId,
      product_id: selectedProductId || null,
      payment_method: paymentMethod,
      channel,
      shipping_cost: shippingValue,
      destination_cep: shippingDestinationCep || selectedClient?.cep || null,
      quantity: showUnitPricing ? Number(quantity) : null,
      unit_price: showUnitPricing ? Number(unitPrice) : null,
      price_tier_label: appliedTierLabel,
      cost_amount: costAmount,
      discount_amount: discountAmount || null,
      discount_type: discountType,
      discount_percent: discountType === "percentage" ? Number(discountPercent) || null : null,
      coupon_id: discountType === "coupon" ? selectedCoupon?.id ?? null : null,
      coupon_code: discountType === "coupon" ? selectedCoupon?.code ?? null : null,
      production_deadline: productionDeadline.trim() || null,
    };

    let quoteError: { message: string } | null = null;
    let createdQuoteId: string | null = null;
    let createdQuote: QuoteWithClient | null = null;

    if (isEditing) {
      const { error } = await supabase.from("quotes").update(sharedPayload).eq("id", quote!.id);
      quoteError = error;
    } else {
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          ...sharedPayload,
          user_id: user.id,
          weight_g: weightG,
          print_time_min: printTimeMin,
          energy_cost: energyCost,
          filament_cost: filamentCost,
          margin_percent: marginPercent,
          status: "paid",
          source: "manual",
        })
        .select("*, clients(name, phone, email, address), products(name, image_url, category, description, calc_inputs)")
        .single();
      quoteError = error;
      createdQuote = data as QuoteWithClient | null;
      createdQuoteId = createdQuote?.id ?? null;
    }

    setSaving(false);

    if (quoteError) {
      setError(quoteError.message);
      return;
    }

    // Baixa de estoque de filamento só se aplica na criação de uma venda nova
    // (editar uma venda não repete o consumo já registrado antes). Agrupa por
    // id antes de aplicar — várias mesas da Calculadora podem usar o mesmo
    // filamento/insumo, e aplicar update por linha sobrescreveria em vez de
    // somar (cada `update` partiria do mesmo snapshot já obtido no load).
    if (!isEditing && createdQuoteId) {
      const filamentDeductions = new Map<string, number>();
      for (const row of usedFilaments) {
        const qty = Number(row.quantityG);
        if (!row.filamentId || !(qty > 0)) continue;
        filamentDeductions.set(row.filamentId, (filamentDeductions.get(row.filamentId) ?? 0) + qty);
      }
      for (const [filamentId, qty] of filamentDeductions) {
        const f = filaments.find((x) => x.id === filamentId);
        if (!f) continue;
        await supabase
          .from("filaments")
          .update({ remaining_weight_g: f.remaining_weight_g - qty })
          .eq("id", f.id);
        await supabase.from("filament_movements").insert({
          filament_id: f.id,
          user_id: user.id,
          movement_type: "sale_consumption",
          quantity_g: -qty,
          related_quote_id: createdQuoteId,
        });
      }

      const supplyDeductions = new Map<string, number>();
      for (const row of usedSupplies) {
        const qty = Number(row.quantity);
        if (!row.supplyId || !(qty > 0)) continue;
        supplyDeductions.set(row.supplyId, (supplyDeductions.get(row.supplyId) ?? 0) + qty);
      }
      for (const [supplyId, qty] of supplyDeductions) {
        const s = supplies.find((x) => x.id === supplyId);
        if (!s) continue;
        await supabase
          .from("supplies")
          .update({ stock_quantity: s.stock_quantity - qty })
          .eq("id", s.id);
        await supabase.from("supply_movements").insert({
          supply_id: s.id,
          user_id: user.id,
          movement_type: "sale_consumption",
          quantity: -qty,
          unit_cost_at_time: s.cost_per_unit,
          related_quote_id: createdQuoteId,
        });
      }
    }

    onCreated?.(createdQuote ?? undefined);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={isEditing ? "Editar Venda" : "Nova Venda Manual"}>
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto scrollbar-glass pr-1">
        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Produto</label>
          <div className="glass-card mb-2 flex gap-1 p-1">
            <button
              type="button"
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-pill bg-neon-gradient py-2 text-xs font-medium text-white sm:min-h-0"
            >
              Produto já cadastrado
            </button>
            <button
              type="button"
              onClick={() => setProductModalOpen(true)}
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary sm:min-h-0"
            >
              Cadastrar Produto
            </button>
          </div>

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
          {selectedProductId && !useProductPricing && (
            <p className="mt-1.5 text-[11px] text-neon-green">
              Vinculado ao catálogo — o Valor Total abaixo continua sendo o calculado, não o preço de cadastro do
              produto.
            </p>
          )}
        </div>

        {showUnitPricing ? (
          <>
            {hasTiers && (
              <div className="glass-card flex gap-1 p-1">
                <button
                  type="button"
                  onClick={() => handlePriceModeChange("unit")}
                  className={cn(
                    "flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium transition-colors sm:min-h-0",
                    priceMode === "unit" ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Valor Unitário
                </button>
                <button
                  type="button"
                  onClick={() => handlePriceModeChange("tier")}
                  className={cn(
                    "flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium transition-colors sm:min-h-0",
                    priceMode === "tier" ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Faixa de Preço
                </button>
              </div>
            )}

            {priceMode === "tier" && hasTiers && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs text-text-muted">Faixa cadastrada</label>
                  {selectedTierIndex !== null && !tierPriceOverridden && (
                    <button
                      type="button"
                      onClick={() => setTierPriceOverridden(true)}
                      className="flex items-center gap-1 text-[11px] text-neon-pink hover:underline"
                    >
                      <Pencil size={11} /> Editar valor
                    </button>
                  )}
                </div>
                <select
                  value={selectedTierIndex ?? ""}
                  onChange={(e) => handleTierSelect(e.target.value, tierRanges)}
                  className="glass-input w-full"
                >
                  <option value="" className="bg-bg-raised">
                    Selecione uma faixa...
                  </option>
                  {tierRanges.map((r) => (
                    <option key={r.originalIndex} value={r.originalIndex} className="bg-bg-raised">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs text-text-muted">Valor Unitário (R$)</label>
                <CurrencyInput
                  value={unitPrice}
                  onChange={setUnitPrice}
                  disabled={unitPriceLocked}
                  className={unitPriceLocked ? "cursor-not-allowed opacity-60" : ""}
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
              <span className="text-xs text-text-muted">Valor do Produto</span>
              <span className="font-numeric text-base font-medium text-text-primary">{formatBRL(productValue)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card flex flex-col gap-0.5 px-4 py-3 opacity-80">
                <span className="text-[11px] text-text-muted">Custo de Produção (R$)</span>
                <span className="font-numeric text-sm font-medium text-text-primary">{formatBRL(costAmount)}</span>
              </div>
              <div className="glass-card flex flex-col gap-0.5 px-4 py-3 opacity-80">
                <span className="text-[11px] text-text-muted">Lucro Estimado (R$)</span>
                <span className="font-numeric text-sm font-medium text-text-primary">{formatBRL(estimatedProfit)}</span>
              </div>
            </div>
            <p className="-mt-2 text-[11px] text-text-muted">
              Lucro estimado considera só o produto — o valor final pode variar com frete/desconto aplicados acima.
            </p>
          </>
        ) : (
          <div>
            <label className="mb-1.5 block text-xs text-text-muted">Valor final (R$)</label>
            <CurrencyInput value={finalPrice} onChange={setFinalPrice} />
          </div>
        )}

        {/* Vindo da Calculadora, filamento/mesa já foi decidido lá — mostrar de
            novo aqui seria pedir a mesma escolha duas vezes. A dedução de
            estoque continua acontecendo normal no submit, só com o estado já
            pré-preenchido (usedFilaments), sem UI pra editar de novo. */}
        {!isEditing && initialUsedFilaments === undefined && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs text-text-muted">Filamento(s) Utilizados</label>
              <button
                type="button"
                onClick={addUsedFilamentRow}
                className="flex items-center gap-1 text-[11px] text-neon-pink hover:underline"
              >
                <Plus size={11} /> Adicionar filamento
              </button>
            </div>

            {usedFilaments.length === 0 ? (
              <p className="text-[11px] text-text-muted">
                {filaments.length === 0
                  ? "Nenhum filamento cadastrado — cadastre em Filamentos pra vincular a uma venda."
                  : "Nenhum filamento vinculado a esta venda (opcional)."}
              </p>
            ) : (
              <div className="space-y-2">
                {usedFilaments.map((row, i) => {
                  const f = filaments.find((x) => x.id === row.filamentId);
                  const qty = Number(row.quantityG) || 0;
                  const overLimit = !!f && qty > f.remaining_weight_g;
                  return (
                    <div key={i} className="glass-card space-y-1.5 p-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <FilamentPickerDropdown
                            filaments={filaments}
                            value={row.filamentId}
                            onChange={(id) => updateUsedFilamentRow(i, { filamentId: id })}
                          />
                        </div>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={row.quantityG}
                          onChange={(e) => updateUsedFilamentRow(i, { quantityG: e.target.value })}
                          placeholder="Qtd (g)"
                          className="glass-input w-24"
                        />
                        <button
                          type="button"
                          onClick={() => removeUsedFilamentRow(i)}
                          className="shrink-0 text-text-muted hover:text-red-400"
                          aria-label="Remover filamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {overLimit && (
                        <p className="flex items-center gap-1 text-[11px] text-amber-400">
                          <AlertTriangle size={11} /> Quantidade maior que o disponível ({f!.remaining_weight_g}g) — a
                          venda não será bloqueada, mas o estoque ficará negativo.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mesma lógica do filamento: insumos já foram escolhidos na Calculadora. */}
        {!isEditing && initialUsedSupplies === undefined && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs text-text-muted">Insumo(s) Utilizados</label>
              <button
                type="button"
                onClick={addUsedSupplyRow}
                className="flex items-center gap-1 text-[11px] text-neon-pink hover:underline"
              >
                <Plus size={11} /> Adicionar insumo
              </button>
            </div>

            {usedSupplies.length === 0 ? (
              <p className="text-[11px] text-text-muted">
                {supplies.length === 0
                  ? "Nenhum insumo cadastrado — cadastre em Cadastros > Insumos pra vincular a uma venda."
                  : "Nenhum insumo vinculado a esta venda (opcional)."}
              </p>
            ) : (
              <div className="space-y-2">
                {usedSupplies.map((row, i) => {
                  const s = supplies.find((x) => x.id === row.supplyId);
                  const qty = Number(row.quantity) || 0;
                  const overLimit = !!s && qty > s.stock_quantity;
                  return (
                    <div key={i} className="glass-card space-y-1.5 p-3">
                      <div className="flex gap-2">
                        <select
                          value={row.supplyId}
                          onChange={(e) => updateUsedSupplyRow(i, { supplyId: e.target.value })}
                          className="glass-input flex-1"
                        >
                          <option value="" className="bg-bg-raised">
                            {supplies.length === 0 ? "Nenhum insumo cadastrado" : "Selecione..."}
                          </option>
                          {supplies.map((sup) => (
                            <option key={sup.id} value={sup.id} className="bg-bg-raised">
                              {sup.name} ({sup.stock_quantity}{sup.unit} disponíveis)
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => updateUsedSupplyRow(i, { quantity: e.target.value })}
                          placeholder={`Qtd${s ? ` (${s.unit})` : ""}`}
                          className="glass-input w-24"
                        />
                        <button
                          type="button"
                          onClick={() => removeUsedSupplyRow(i)}
                          className="shrink-0 text-text-muted hover:text-red-400"
                          aria-label="Remover insumo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {overLimit && (
                        <p className="flex items-center gap-1 text-[11px] text-amber-400">
                          <AlertTriangle size={11} /> Quantidade maior que o disponível ({s!.stock_quantity}{s!.unit}) — a
                          venda não será bloqueada, mas o estoque ficará negativo.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Valor Frete (R$)</label>
          <div className="relative">
            <input
              readOnly
              value={shippingValue != null ? formatBRL(shippingValue) : ""}
              className="glass-input w-full cursor-not-allowed py-2.5 pr-28 opacity-80"
              placeholder="Nenhum frete calculado"
            />
            <button
              type="button"
              onClick={() => setShippingQuoteOpen(true)}
              className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg bg-neon-gradient px-3 py-1.5 text-[11px] font-medium text-white hover:opacity-90"
            >
              <Truck size={11} /> {shippingValue != null ? "Recalcular" : "Calcular"}
            </button>
          </div>
          {shippingSummary && <p className="mt-1 text-[11px] text-text-muted">{shippingSummary}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-text-muted">Desconto</label>
          <div className="glass-card mb-2 flex gap-1 p-1">
            {(
              [
                { value: "fixed", label: "Fixo" },
                { value: "percentage", label: "Percentual" },
                { value: "coupon", label: "Cupom" },
              ] as { value: QuoteDiscountType; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleDiscountTypeChange(opt.value)}
                className={cn(
                  "flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium transition-colors sm:min-h-0",
                  discountType === opt.value ? "bg-neon-gradient text-white" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {discountType === "fixed" && (
            <>
              <CurrencyInput value={discount} onChange={handleDiscountChange} />
              {discountWarning && <p className="mt-1 text-[11px] text-amber-400">{discountWarning}</p>}
            </>
          )}

          {discountType === "percentage" && (
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="glass-input w-full"
              placeholder="0,0%"
            />
          )}

          {discountType === "coupon" && (
            <>
              <select
                value={selectedCouponId}
                disabled={couponBusy}
                onChange={(e) => switchCouponReservation(e.target.value || null, productValue)}
                className={cn("glass-input w-full", couponBusy && "cursor-not-allowed opacity-60")}
              >
                <option value="" className="bg-bg-raised">
                  {availableCoupons.length === 0 ? "Nenhum cupom válido pra este pedido" : "Selecione..."}
                </option>
                {availableCoupons.map((c) => (
                  <option key={c.id} value={c.id} className="bg-bg-raised">
                    {c.code} · {c.discount_type === "percentage" ? `${c.discount_value}%` : formatBRL(c.discount_value)}
                    {c.id === selectedCouponId && getCouponStatusLabel(c) !== "Ativo" ? ` (${getCouponStatusLabel(c)})` : ""}
                  </option>
                ))}
              </select>
              {couponError && <p className="mt-1 text-[11px] text-red-400">{couponError}</p>}
            </>
          )}
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
          <label className="mb-1.5 block text-xs text-text-muted">Prazo de Produção (opcional)</label>
          <input
            type="text"
            value={productionDeadline}
            onChange={(e) => setProductionDeadline(e.target.value)}
            className="glass-input w-full"
            placeholder="Ex: 3 dias úteis, até 20/08..."
          />
        </div>

        {!isEditing && <p className="text-[11px] text-text-muted">Entra em Vendas já como Pago.</p>}

        <div className="glass-card flex gap-1 p-1">
          <button
            type="button"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-pill bg-neon-gradient py-2 text-xs font-medium text-white sm:min-h-0"
          >
            Cliente existente
          </button>
          <button
            type="button"
            onClick={() => setClientModalOpen(true)}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-pill py-2 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary sm:min-h-0"
          >
            Novo cliente
          </button>
        </div>

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

        <div className="glass-card flex items-center justify-between px-4 py-3">
          <span className="text-xs text-text-muted">Valor Total</span>
          <span className="neon-text font-numeric text-lg font-semibold">{formatBRL(computedTotal)}</span>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <NeonButton type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </NeonButton>
          <NeonButton type="submit" disabled={saving}>
            {saving ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Venda"}
          </NeonButton>
        </div>
      </form>

      <NewProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onCreated={handleProductCreated}
        zIndexClass="z-[60]"
      />
      <NewClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onCreated={handleClientCreated}
        zIndexClass="z-[60]"
      />
      <ShippingQuoteWidget
        open={shippingQuoteOpen}
        onClose={() => setShippingQuoteOpen(false)}
        initialDestinationCep={selectedClient?.cep ?? ""}
        onSelect={handleShippingSelected}
        zIndexClass="z-[60]"
      />
    </Modal>
  );
}
