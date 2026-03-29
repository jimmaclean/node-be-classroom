import type { MiddlewareHandler } from "hono";

// NOTE: express-rate-limit does not work with Hono's fetch-based handler.
// This is a simple in-memory rate limiter for Node.js + Hono.
// See module-09/src/middleware/rateLimiter.ts for the full annotated version.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(
  windowMs: number,
  max: number,
  message?: object
): MiddlewareHandler {
  const requests = new Map<string, RateLimitEntry>();

  return async (c, next) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now > entry.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      c.header("RateLimit-Limit", String(max));
      c.header("RateLimit-Remaining", String(max - 1));
      await next();
      return;
    }

    if (entry.count >= max) {
      return c.json(
        message ?? { error: "Too many requests, please try again later." },
        429
      );
    }

    entry.count++;
    c.header("RateLimit-Limit", String(max));
    c.header("RateLimit-Remaining", String(max - entry.count));
    await next();
  };
}
