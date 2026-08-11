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
  trial_ends_at: string;
  payment_method: PaymentMethodType;
  paid_until: string | null;
  mp_customer_id: string | null;
  mp_subscription_id: string | null;
  studio_name: string | null;
  phone: string | null;
  document: string | null;
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
  // Runtime telemetry (not persisted columns, joined from latest webhook payload)
  current_job?: {
    file_name: string;
    progress_percent: number;
    eta_minutes: number;
    nozzle_temp_c: number;
    bed_temp_c: number;
  };
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

export interface Quote {
  id: string;
  user_id: string;
  project_name: string;
  weight_g: number;
  print_time_min: number;
  energy_cost: number;
  filament_cost: number;
  margin_percent: number;
  final_price: number;
  client_id: string | null;
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

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: string;
  description: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  price_tiers: PriceTier[];
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
}

export interface Settings {
  user_id: string;
  electricity_kwh_rate: number;
  default_markup: number;
  hourly_work_rate: number;
  marketplace_fees_json: Record<string, number>;
  operational_risk_json: Record<string, number>;
}