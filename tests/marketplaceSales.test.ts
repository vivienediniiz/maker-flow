import { describe, it, expect, vi } from "vitest";
import { resolveMarketplaceStatus, saveMarketplaceSales } from "@/lib/marketplaceSales";
import { signTikTokShopRequest } from "@/lib/tiktokShop";

describe("signTikTokShopRequest", () => {
  it("bate com o vetor de teste oficial da doc", () => {
    const sign = signTikTokShopRequest({
      path: "/authorization/202309/shops",
      query: { app_key: "29a39d", timestamp: "1623812664" },
      appSecret: "e59af819cc",
    });
    expect(sign).toBe("b596b73e0cc6de07ac26f036364178ab16b0a907af13d43f0a0cd2345f582dc8");
  });

  it("inclui o corpo na assinatura", () => {
    const base = { path: "/p", query: { a: "1" }, appSecret: "s" };
    expect(signTikTokShopRequest({ ...base, body: "{}" })).not.toBe(signTikTokShopRequest(base));
  });
});

describe("resolveMarketplaceStatus", () => {
  it("cancelamento sempre vale", () => {
    expect(resolveMarketplaceStatus("in_production", "cancelled")).toBe("cancelled");
  });
  it("pago não desfaz andamento do maker", () => {
    expect(resolveMarketplaceStatus("shipped", "paid")).toBe("shipped");
    expect(resolveMarketplaceStatus("in_production", "paid")).toBe("in_production");
  });
  it("pago promove orçamento/expirado", () => {
    expect(resolveMarketplaceStatus("sent", "paid")).toBe("paid");
    expect(resolveMarketplaceStatus("expired", "paid")).toBe("paid");
  });
});

function fakeAdmin(existing: { id: string; external_order_id: string; status: string }[]) {
  const upsert = vi.fn(() => ({ select: async () => ({ data: [{ id: "n" }], error: null }) }));
  const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
  const read = { eq: () => read, in: async () => ({ data: existing, error: null }) };
  const admin = { from: () => ({ select: () => read, upsert, update }) };
  return { admin: admin as any, upsert, update };
}

const sale = (id: string, status: "paid" | "cancelled" = "paid") => ({
  row: { user_id: "u", source: "tiktok_shop", external_order_id: id, status },
});

describe("saveMarketplaceSales", () => {
  it("insere novos sem sobrescrever e só ajusta status dos existentes", async () => {
    const { admin, upsert, update } = fakeAdmin([
      { id: "q1", external_order_id: "A", status: "shipped" },
      { id: "q2", external_order_id: "B", status: "sent" },
    ]);
    const r = await saveMarketplaceSales(admin, [sale("A"), sale("B"), sale("C")]);
    expect(r).toEqual({ inserted: 1, updated: 1, unchanged: 1 });
    expect(upsert).toHaveBeenCalledWith([sale("C").row], expect.objectContaining({ ignoreDuplicates: true }));
    expect(update).toHaveBeenCalledWith({ status: "paid" });
  });

  it("lote vazio não toca no banco", async () => {
    const { admin, upsert } = fakeAdmin([]);
    expect(await saveMarketplaceSales(admin, [])).toEqual({ inserted: 0, updated: 0, unchanged: 0 });
    expect(upsert).not.toHaveBeenCalled();
  });
});
