export type SubscriptionTier = "free" | "monthly" | "quarterly";
// Legado — billing_cycle na prática espelha o próprio subscription_tier
// ("monthly"/"quarterly" não são mais um eixo independente de plano).
export type BillingCycle = "monthly" | "quarterly";
export type SubscriptionStatus = "inactive" | "active" | "paused" | "cancelled";

export type PaymentMethodType = "card" | "pix" | null;

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: SubscriptionTier;
  billing_cycle: BillingCycle | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string; // ISO timestamp — fim do período gratuito de 7 dias
  payment_method: PaymentMethodType; // card (assinatura automática) | pix (renovação manual) | null
  paid_until: string | null; // ISO timestamp — só relevante quando payment_method = pix
  mp_customer_id: string | null;
  mp_subscription_id: string | null;
  studio_name: string | null;
  phone: string | null;
  document: string | null; // CNPJ ou CPF
  cep: string | null;
  street: string | null;
  street_number: string | null;
  state: string | null;
  complement: string | null;
  /** Bairro — junto com `city`, obrigatório pra gerar etiqueta (endereço de origem/remetente na API do Melhor Envio). */
  neighborhood: string | null;
  city: string | null;
  address: string | null;
  instagram: string | null;
  website: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** Código único do usuário como afiliado — gerado sob demanda ao abrir o painel de Afiliados pela primeira vez. */
  affiliate_code: string | null;
  /** Quem indicou este usuário (id de outro profile), resolvido a partir de ?ref= no cadastro. */
  referred_by: string | null;
  /** Carimbo da primeira cobrança de assinatura confirmada — usado só pra não gerar comissão de afiliado de novo em renovações. */
  first_payment_confirmed_at: string | null;
  store_enabled: boolean;
  store_slug: string | null;
  store_headline: string | null;
  is_admin: boolean;
}

export type SupportTicketStatus = "open" | "closed";
export type SupportSenderType = "customer" | "admin";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: SupportTicketStatus;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketAdminView extends SupportTicket {
  customer_name: string | null;
  customer_email: string | null;
  last_sender_type: SupportSenderType | null;
  last_message_at: string | null;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_type: SupportSenderType;
  sender_id: string | null;
  message: string;
  created_at: string;
}

export interface StoreCheckout {
  id: string;
  seller_user_id: string;
  mp_preference_id: string | null;
  status: "pending" | "paid" | "expired";
  /** "infinitepay" só é usado pela loja em NEXT_PUBLIC_INFINITEPAY_STORE_SLUG — não é multi-tenant como o Mercado Pago. */
  payment_provider: "mercado_pago" | "infinitepay";
  infinitepay_order_nsu: string | null;
  infinitepay_transaction_nsu: string | null;
  infinitepay_slug: string | null;
  infinitepay_receipt_url: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_cep: string | null;
  buyer_street: string | null;
  buyer_number: string | null;
  buyer_complement: string | null;
  buyer_neighborhood: string | null;
  buyer_city: string | null;
  buyer_state: string | null;
  items: { product_id: string; name: string; unit_price: number; quantity: number; customization?: string | null }[];
  total_amount: number;
  created_at: string;
}

/** Espelha a view pública `store_products_public` — só as colunas seguras pra expor a visitante sem login. */
export interface StoreProductPublic {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sale_price: number;
  store_display_order: number | null;
  category: string | null;
  estimated_production_days: number | null;
  allows_customization: boolean;
  customization_label: string | null;
}

/** Espelha a view pública `store_profiles_public`. */
export interface StoreProfilePublic {
  user_id: string;
  store_slug: string;
  store_headline: string | null;
  studio_name: string | null;
  avatar_url: string | null;
  store_enabled: boolean;
  payment_ready: boolean;
  /** `store_settings.logo_url`, com fallback pro avatar do perfil quando não configurado. */
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  title_font: string | null;
  whatsapp_number: string | null;
  whatsapp_default_message: string | null;
  /** Texto padrão pra prazo de produção quando o produto não tem `estimated_production_days`. */
  default_production_message: string | null;
}

/** Identidade visual + WhatsApp da Loja Online, configurados pelo lojista (1:1 com o usuário). */
export interface StoreSettings {
  user_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  title_font: string | null;
  whatsapp_number: string | null;
  whatsapp_default_message: string | null;
  default_production_message: string | null;
  updated_at: string;
}

/** Um banner do slideshow do topo da loja — visão do dono (painel). */
export interface StoreBanner {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  target_link: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
}

/** Espelha a view pública `store_banners_public` — só banners ativos, já ordenados. */
export interface StoreBannerPublic {
  id: string;
  user_id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  target_link: string | null;
  display_order: number;
}

export interface AffiliateCommission {
  id: string;
  affiliate_user_id: string;
  referred_user_id: string;
  plan_id: string;
  amount: number;
  status: "pending" | "paid";
  created_at: string;
}

export type PrinterStatus = "idle" | "printing" | "paused" | "error" | "offline";

export interface Printer {
  id: string;
  user_id: string;
  name: string;
  model: string;
  watts_power: number;
  cost_per_hour: number;
  status: PrinterStatus;
  api_key_webhook: string | null;
  // Snapshot do ultimo webhook de telemetria recebido (ver /api/v1/printers/telemetry)
  current_file_name: string | null;
  current_progress_percent: number | null;
  current_eta_minutes: number | null;
  current_nozzle_temp_c: number | null;
  current_bed_temp_c: number | null;
  last_telemetry_at: string | null;
  last_snapshot_at: string | null;
}

export interface Filament {
  id: string;
  user_id: string;
  brand: string;
  material: string;
  color_hex: string;
  price_per_kg: number;
  remaining_weight_g: number;
  weight_total_g: number;
  low_stock_threshold_g: number | null;
}

export type FilamentMovementType = "purchase" | "sale_consumption" | "manual_adjustment";

export interface FilamentMovement {
  id: string;
  filament_id: string;
  user_id: string;
  movement_type: FilamentMovementType;
  quantity_g: number;
  related_quote_id: string | null;
  note: string | null;
  created_at: string;
}

export interface FilamentMovementWithFilament extends FilamentMovement {
  filaments: { brand: string; material: string; color_hex: string } | null;
  quotes: { order_number: number } | null;
}
export type QuoteChannel = "whatsapp" | "instagram" | "tiktok" | "presencial" | "marketplaces";

// Origem do REGISTRO (quem criou/atualizou essa venda) — diferente de `channel`
// (canal de venda escolhido manualmente, usado em cálculo de taxa/margem).
export type QuoteSource = "mercado_pago" | "mercado_livre" | "shopee" | "tiktok_shop" | "manual" | "loja_online";

export type QuoteStatus = "sent" | "awaiting_payment" | "paid" | "in_production" | "shipped" | "expired" | "cancelled";

export type QuotePaymentMethod =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "cash"
  | "transfer"
  | "other"
  | "payment_link"
  | "infinitepay";

export interface Quote {
  id: string;
  user_id: string;
  order_number: number;
  project_name: string;
  weight_g: number;
  print_time_min: number;
  energy_cost: number;
  filament_cost: number;
  margin_percent: number;
  final_price: number;
  client_id: string | null;
  product_id: string | null;
  status: QuoteStatus;
  sent_at: string;
  payment_method: QuotePaymentMethod | null;
  channel: QuoteChannel | null;
  shipping_cost: number | null;
  destination_cep: string | null;
  /** Peso/dimensões usados na cotação de frete feita ao criar a venda — reaproveitados pra pré-preencher a compra da etiqueta depois. */
  shipping_weight_g: number | null;
  shipping_height_cm: number | null;
  shipping_width_cm: number | null;
  shipping_length_cm: number | null;
  source: QuoteSource;
  external_order_id: string | null;
  buyer_name: string | null;
  platform_fee: number;
  cost_amount: number;
  net_amount: number;
  /** Id (uuid) do item no carrinho do Melhor Envio — não é o `service_id` numérico da transportadora, é o `id` retornado por POST /me/cart, usado depois em checkout/generate/print. */
  shipping_service_id: string | null;
  shipping_tracking_code: string | null;
  /** URL do PDF da etiqueta (GET /me/imprimir/pdf/{id}) — a versão ZPL não é persistida, é buscada sob demanda. */
  shipping_label_url: string | null;
  shipping_label_status: ShippingLabelStatus;
  /** Valor de fato debitado da carteira Melhor Envio — pode divergir do `shipping_cost` cotado/mostrado ao cliente. */
  shipping_purchased_cost: number | null;
  shipping_purchased_at: string | null;
  shipping_generated_at: string | null;
  /** Marca a intenção/ação de clicar em "Imprimir Etiqueta" — não confirma que a impressão física aconteceu. */
  shipping_printed_at: string | null;
  shipping_carrier_name: string | null;
  shipping_service_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  price_tier_label: string | null;
  discount_amount: number | null;
  coupon_id: string | null;
  coupon_code: string | null;
  discount_type: QuoteDiscountType | null;
  discount_percent: number | null;
  /** @deprecated Texto livre ("3 dias úteis, até 20/08...") — substituído por `production_deadline_date`. Mantido só pra exibir registros salvos antes dessa mudança. */
  production_deadline: string | null;
  /** Início do período de produção (yyyy-mm-dd), opcional — só informativo. */
  production_start_date: string | null;
  /** Fim do período/prazo de produção (yyyy-mm-dd) — usado pro destaque/alerta de prazo vencendo. */
  production_deadline_date: string | null;
  /** Agrupa quotes criadas a partir do mesmo checkout da Loja Online (uma linha por produto do carrinho). */
  storefront_checkout_id: string | null;
  /** URL de Checkout Pro gerada por "Gerar Link de Cobrança" — ao criar, o status volta pra "sent" até o webhook confirmar o pagamento (external_reference = id desta quote). */
  payment_link_url: string | null;
  mp_preference_id: string | null;
  infinitepay_order_nsu: string | null;
  infinitepay_transaction_nsu: string | null;
  /** Produto com personalização a pedido do cliente (gravação, cor específica etc.). */
  is_custom: boolean;
  customization_notes: string | null;
}

export type QuoteDiscountType = "fixed" | "percentage" | "coupon";

/** `nao_iniciado` → `no_carrinho` (compra iniciada mas checkout falhou, recuperável) → `comprado` → `gerado` → `impresso`. `cancelado` reservado pra uma entrega futura (cancelamento de etiqueta). */
export type ShippingLabelStatus = "nao_iniciado" | "no_carrinho" | "comprado" | "gerado" | "impresso" | "cancelado";

export interface QuoteWithClient extends Quote {
  clients: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    cep: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    document: string | null;
  } | null;
  products: { name: string; image_url: string | null; category: string; description: string | null; calc_inputs: CalcInputs | null } | null;
}

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type ProductionStatus = "queued" | "printing" | "post_processing" | "ready" | "shipped";

export interface Order {
  id: string;
  user_id: string;
  quote_id: string | null;
  client_id: string | null;
  client_name: string;
  status_payment: PaymentStatus;
  status_production: ProductionStatus;
  channel: "site" | "whatsapp" | "marketplace" | "presencial";
  total_value: number;
  deadline: string; // ISO date
}

export interface PriceTier {
  quantity: number;
  price: number;
}

export interface CalcInputs {
  beds: {
    name: string;
    /** Peso/tempo TOTAIS da mesa cheia (direto do fatiador) — a soma de todas as mesas já representa o custo de 1 unidade completa do produto. */
    weightG: number;
    timeH: number;
    timeM: number;
    watts: number;
    filamentId?: string;
    /**
     * "A" = lote de peças idênticas nesta mesa (peso/tempo = total real da mesa, sem divisão);
     * "B" = peça única/montagem, mesa inteira conta como 1 contribuição (padrão);
     * "C" = mix de peças diferentes, custo rateado por peso entre `mixedItems`.
     * Ausente = "B".
     */
    modelType?: "A" | "B" | "C";
    /** Legado — não afeta mais o cálculo em nenhum modo. */
    piecesInBed?: number;
    /** Só usado quando `modelType === "C"`. */
    mixedItems?: { id: string; description: string; weightG: number; quantity: number }[];
    /** % aplicado só no cálculo de custo (filamento/energia) — peso/tempo digitados não mudam. */
    safetyMarginPercent?: number;
    /** @deprecated Modo Item Único/Lote removido — mantido só pra ler registros salvos antes dessa mudança (tratado como "single"). */
    mode?: "single" | "batch";
    /** @deprecated Ver `mode`. */
    itemsCount?: number;
  }[];
  /** @deprecated Substituído pelo filamento próprio de cada mesa — mantido só pra ler registros salvos antes dessa mudança. */
  filamentPricePerKg?: number;
  kwhRate: number;
  laborHours: number;
  hourlyRate: number;
  extras: number;
  paintedByHand: boolean;
  paintCost: number;
  marketplaceFee: number;
  marginPercent: number;
  quantity: number;
}

export interface CalculatorDraft {
  id: string;
  user_id: string;
  name: string;
  calc_inputs: CalcInputs;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string | null;
  image_url: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  /** Alerta de estoque baixo só dispara quando configurado — sem valor universal padrão (varia demais de produto pra produto). */
  low_stock_threshold: number | null;
  price_tiers: PriceTier[];
  calc_inputs: CalcInputs | null;
  /** Aparece na vitrine pública da Loja Online quando true. */
  in_store: boolean;
  /** Ordem de exibição na loja — só relevante entre produtos com in_store=true. */
  store_display_order: number | null;
  /** Prazo de produção estimado em dias, exibido na página do produto na loja. Sem valor = usa o texto padrão configurado em store_settings. */
  estimated_production_days: number | null;
  /** Quando true, a loja mostra um campo de texto livre pro cliente antes de comprar (ex: nome pra gravar). */
  allows_customization: boolean;
  /** Rótulo do campo de personalização exibido na loja (ex: "Texto para gravação") — só usado quando allows_customization=true. */
  customization_label: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
}

export type BranchType = "matriz" | "filial";

export interface Branch {
  id: string;
  user_id: string;
  name: string;
  type: BranchType;
  address: string | null;
  created_at: string;
}

export type SupplyUnit = "un" | "g" | "ml" | "kg" | "l";

export interface Supply {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  unit: SupplyUnit;
  cost_per_unit: number;
  stock_quantity: number;
  low_stock_threshold: number | null;
  created_at: string;
}

export type SupplyMovementType = "purchase" | "sale_consumption" | "manual_adjustment";

export interface SupplyMovement {
  id: string;
  supply_id: string;
  user_id: string;
  movement_type: SupplyMovementType;
  quantity: number;
  unit_cost_at_time: number | null;
  related_quote_id: string | null;
  note: string | null;
  created_at: string;
}

export interface SupplyMovementWithSupply extends SupplyMovement {
  supplies: { name: string; category: string | null; unit: SupplyUnit } | null;
  quotes: { order_number: number } | null;
}

export interface ExtraPurchase {
  id: string;
  user_id: string;
  description: string;
  category: string | null;
  amount: number;
  supplier: string | null;
  purchased_at: string;
  notes: string | null;
  created_at: string;
}

/** Despesa recorrente (aluguel, energia, internet...) — entra no custo operacional do Financeiro uma vez por mês corrente, independente do dia de vencimento. */
export interface FixedExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string | null;
  /** Dia do mês (1-31) só como referência/lembrete — não afeta o cálculo. */
  due_day: number | null;
  active: boolean;
  created_at: string;
}

/**
 * Só guarda o que NÃO dá pra derivar de outra tabela: se já viu o carrossel,
 * e se pulou de propósito um passo opcional. Os 5 passos obrigatórios são
 * verificados ao vivo (ver computeOnboardingStatus em lib/onboarding.ts)
 * contra profiles/settings/printer_assets/filaments — sem flag própria, pra
 * detectar automaticamente quando um cadastro que já existiu foi apagado.
 */
export interface OnboardingProgress {
  user_id: string;
  /** Já viu o carrossel de boas-vindas (tela cheia, só no primeiro login) — não toca mais nele depois disso, "Pular" ou "Começar" tanto faz. */
  carousel_seen: boolean;
  supplies_skipped: boolean;
  fixed_expenses_skipped: boolean;
  updated_at: string;
}

export type PrinterAssetStatus = "active" | "maintenance" | "inactive" | "sold";

export interface PrinterAsset {
  id: string;
  user_id: string;
  branch_id: string | null;
  model: string;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  supplier: string | null;
  invoice_url: string | null;
  warranty_expiry_date: string | null;
  status: PrinterAssetStatus;
  estimated_usage_hours: number;
  power_consumption_w: number | null;
  notes: string | null;
  created_at: string;
}

export interface PrinterMaintenanceLog {
  id: string;
  printer_asset_id: string;
  user_id: string;
  description: string;
  performed_at: string;
  cost: number | null;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  instagram: string | null;
  /** CPF ou CNPJ — obrigatório pra gerar etiqueta (destinatário na API do Melhor Envio). */
  document: string | null;
}

export interface Sale {
  id: string;
  user_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  channel: "presencial" | "whatsapp" | "marketplace" | "site";
  sold_at: string;
  filament_id: string | null;
}

export interface Settings {
  user_id: string;
  electricity_kwh_rate: number;
  default_markup: number;
  hourly_work_rate: number;
  marketplace_fees_json: Record<string, number>;
  operational_risk_json: Record<string, number>;
  origin_cep: string | null;
  origin_address: string | null;
  pdf_accent_color: string | null;
  pdf_footer_message: string | null;
  pdf_show_production_deadline: boolean;
}

export interface RiskTier {
  id: string;
  user_id: string;
  name: string;
  extra_margin_percent: number;
  description: string | null;
  created_at: string;
}

export type CouponDiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  user_id: string;
  code: string;
  campaign_name: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_order_value: number | null;
  usage_limit: number | null;
  times_used: number;
  valid_until: string | null; // ISO date
  active: boolean;
  created_at: string;
}

export type IntegrationPlatform = "mercado_pago" | "mercado_livre" | "shopee" | "tiktok_shop" | "melhor_envio";
export type IntegrationStatus = "connected" | "disconnected" | "error";

export interface Integration {
  id: string;
  user_id: string;
  platform: IntegrationPlatform;
  status: IntegrationStatus;
  credential_secret_id: string | null;
  webhook_secret: string | null;
  last_event_at: string | null;
  created_at: string;
}

/** Meta de vendas de um mês — no máximo uma por (usuário, mês). */
export interface SalesGoal {
  id: string;
  user_id: string;
  month: string; // ISO date, primeiro dia do mês (ex: "2026-08-01")
  revenue_goal: number | null;
  sales_count_goal: number | null;
  created_at: string;
  updated_at: string;
}

export type FeedbackCategory = "suggestion" | "complaint" | "rating";

export interface FeedbackSubmission {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  category: FeedbackCategory;
  rating: number | null;
  message: string | null;
  created_at: string;
}