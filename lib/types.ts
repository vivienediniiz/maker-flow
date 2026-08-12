export type SubscriptionTier = "free" | "starter" | "pro" | "studio";
export type BillingCycle = "monthly" | "yearly";
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
  address: string | null;
  instagram: string | null;
  website: string | null;
  bio: string | null;
  avatar_url: string | null;
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
}

export interface Filament {
  id: string;
  user_id: string;
  brand: string;
  material: string;
  color_hex: string;
  price_per_kg: number;
  remaining_weight_g: number;
}
export type QuoteChannel = "tiktok" | "whatsapp" | "presencial" | "shopee" | "mercado_livre";

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
}

export type QuoteStatus = "sent" | "paid" | "in_production" | "shipped" | "expired";

export type QuotePaymentMethod = "pix" | "credit_card" | "debit_card" | "cash" | "transfer" | "other";

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
}

export interface QuoteWithClient extends Quote {
  clients: { name: string; phone: string | null; email: string | null; address: string | null } | null;
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
  beds: { name: string; weightG: number; timeH: number; timeM: number; watts: number }[];
  filamentPricePerKg: number;
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
  price_tiers: PriceTier[];
  calc_inputs: CalcInputs | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
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
}

export const QUOTE_CHANNEL_LABELS: Record<string, string> = {
  tiktok: "TikTok Shop",
  whatsapp: "WhatsApp",
  presencial: "Presencial",
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
};