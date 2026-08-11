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