import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * `null` até UPSTASH_REDIS_REST_URL/TOKEN serem configurados (Netlify → Site
 * settings → Environment variables) OU se o valor configurado for inválido
 * (ex: colaram a connection string redis://, não a REST URL https://) —
 * nesse caso a rota que usa isso loga um aviso e segue sem limitar, em vez
 * de derrubar o build/checkout inteiro. O construtor do Redis valida a URL
 * na hora (lança na hora do import, por isso o try/catch aqui fora).
 */
function buildCheckoutRateLimit(): Ratelimit | null {
  if (!redisUrl || !redisToken) return null;
  try {
    return new Ratelimit({
      redis: new Redis({ url: redisUrl, token: redisToken }),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "ratelimit:store-checkout",
    });
  } catch (err) {
    console.error(
      "[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN configurados mas inválidos — rate limit desativado.",
      (err as Error).message
    );
    return null;
  }
}

export const checkoutRateLimit = buildCheckoutRateLimit();

export function requestIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
