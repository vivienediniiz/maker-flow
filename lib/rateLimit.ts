import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * `null` até UPSTASH_REDIS_REST_URL/TOKEN serem configurados (Netlify → Site
 * settings → Environment variables) — nesse caso a rota que usa isso loga um
 * aviso e segue sem limitar, em vez de derrubar o checkout inteiro por falta
 * de env var. Depois de configurado, ativa sozinho sem precisar mexer em
 * código de novo.
 */
export const checkoutRateLimit =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: new Redis({ url: redisUrl, token: redisToken }),
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        prefix: "ratelimit:store-checkout",
      })
    : null;

export function requestIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
