import type { Coupon } from "@/lib/types";

export function isCouponValid(coupon: Coupon, orderValue: number): boolean {
  if (!coupon.active) return false;
  if (coupon.valid_until && coupon.valid_until < new Date().toISOString().slice(0, 10)) return false;
  if (coupon.usage_limit != null && coupon.times_used >= coupon.usage_limit) return false;
  if (coupon.min_order_value != null && orderValue < coupon.min_order_value) return false;
  return true;
}

export function getCouponStatusLabel(coupon: Coupon): "Ativo" | "Inativo" | "Expirado" | "Esgotado" {
  if (!coupon.active) return "Inativo";
  if (coupon.valid_until && coupon.valid_until < new Date().toISOString().slice(0, 10)) return "Expirado";
  if (coupon.usage_limit != null && coupon.times_used >= coupon.usage_limit) return "Esgotado";
  return "Ativo";
}

export function computeCouponDiscount(coupon: Coupon, orderValue: number): number {
  const raw = coupon.discount_type === "percentage" ? (orderValue * coupon.discount_value) / 100 : coupon.discount_value;
  return Math.min(Math.max(raw, 0), orderValue);
}
