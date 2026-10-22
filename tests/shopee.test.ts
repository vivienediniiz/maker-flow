import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildShopeeAuthUrl,
  getShopeeConfig,
  mapShopeeOrderStatus,
  signShopeeRequest,
  validateShopeePushSignature,
} from "@/lib/shopee";

const hmac = (key: string, base: string) => crypto.createHmac("sha256", key).update(base).digest("hex");

afterEach(() => vi.unstubAllEnvs());

describe("signShopeeRequest", () => {
  const base = { partnerId: "1000016", partnerKey: "chave-secreta", path: "/api/v2/order/get_order_detail", timestamp: 1657263479 };

  it("API pública assina partner_id + path + timestamp", () => {
    expect(signShopeeRequest(base)).toBe(hmac("chave-secreta", "1000016/api/v2/order/get_order_detail1657263479"));
  });

  it("API de loja acrescenta access_token e shop_id, nessa ordem", () => {
    const sign = signShopeeRequest({ ...base, accessToken: "tok", shopId: "54804" });
    expect(sign).toBe(hmac("chave-secreta", "1000016/api/v2/order/get_order_detail1657263479tok54804"));
    expect(sign).not.toBe(signShopeeRequest(base));
  });
});

describe("validateShopeePushSignature", () => {
  const url = "https://www.studiomaker3d.com.br/api/webhooks/shopee";
  const body = '{"data":{"ordersn":"220810QSK8S7BX","status":"PROCESSED"},"shop_id":727720655,"code":3}';
  const good = hmac("partner-key", `${url}|${body}`);

  it("aceita a assinatura de URL + '|' + corpo cru", () => {
    expect(validateShopeePushSignature({ url, rawBody: body, authHeader: good, partnerKey: "partner-key" })).toBe(true);
  });

  it("recusa corpo alterado, URL diferente, chave errada, header ausente ou de tamanho diferente", () => {
    expect(validateShopeePushSignature({ url, rawBody: body + " ", authHeader: good, partnerKey: "partner-key" })).toBe(false);
    expect(validateShopeePushSignature({ url: url + "/x", rawBody: body, authHeader: good, partnerKey: "partner-key" })).toBe(false);
    expect(validateShopeePushSignature({ url, rawBody: body, authHeader: good, partnerKey: "outra" })).toBe(false);
    expect(validateShopeePushSignature({ url, rawBody: body, authHeader: null, partnerKey: "partner-key" })).toBe(false);
    expect(validateShopeePushSignature({ url, rawBody: body, authHeader: "abc", partnerKey: "partner-key" })).toBe(false);
  });
});

describe("mapShopeeOrderStatus", () => {
  it.each([
    ["READY_TO_SHIP", "paid"],
    ["PROCESSED", "paid"],
    ["SHIPPED", "paid"],
    ["TO_CONFIRM_RECEIVE", "paid"],
    ["COMPLETED", "paid"],
    ["INVOICE_PENDING", "paid"],
    ["CANCELLED", "cancelled"],
    ["UNPAID", null],
    ["PENDING", null],
    ["IN_CANCEL", null],
    ["TO_RETURN", null],
    [undefined, null],
    ["101", null],
  ])("%s -> %s", (status, expected) => {
    expect(mapShopeeOrderStatus(status as string | undefined)).toBe(expected);
  });
});

describe("buildShopeeAuthUrl", () => {
  it("usa o host de produção do Brasil, sem assinatura", () => {
    vi.stubEnv("SHOPEE_PARTNER_ID", "123");
    vi.stubEnv("SHOPEE_PARTNER_KEY", "k");
    vi.stubEnv("SHOPEE_ENV", "production");
    const url = new URL(buildShopeeAuthUrl("https://www.studiomaker3d.com.br/cb", "user-1"));
    expect(url.origin + url.pathname).toBe("https://open.shopee.com.br/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      partner_id: "123",
      auth_type: "seller",
      redirect_uri: "https://www.studiomaker3d.com.br/cb",
      response_type: "code",
      state: "user-1",
    });
  });

  it("SHOPEE_ENV=sandbox troca os hosts de autorização e de API", () => {
    vi.stubEnv("SHOPEE_PARTNER_ID", "123");
    vi.stubEnv("SHOPEE_PARTNER_KEY", "k");
    vi.stubEnv("SHOPEE_ENV", "sandbox");
    expect(buildShopeeAuthUrl("https://x.com/cb", "u")).toMatch(/^https:\/\/open\.sandbox\.test-stable\.shopee\.com\.br\/auth\?/);
    expect(getShopeeConfig()?.apiHost).toBe("https://openplatform.sandbox.test-stable.shopee.sg");
  });

  it("a chave do push cai na chave da API, a menos que SHOPEE_PUSH_PARTNER_KEY exista", () => {
    vi.stubEnv("SHOPEE_PARTNER_ID", "123");
    vi.stubEnv("SHOPEE_PARTNER_KEY", "chave-api");
    vi.stubEnv("SHOPEE_PUSH_PARTNER_KEY", "");
    expect(getShopeeConfig()?.pushPartnerKey).toBe("chave-api");
    vi.stubEnv("SHOPEE_PUSH_PARTNER_KEY", "chave-push");
    expect(getShopeeConfig()?.pushPartnerKey).toBe("chave-push");
  });

  it("sem credenciais, a configuração fica indisponível", () => {
    vi.stubEnv("SHOPEE_PARTNER_ID", "");
    vi.stubEnv("SHOPEE_PARTNER_KEY", "");
    expect(getShopeeConfig()).toBeNull();
  });
});
