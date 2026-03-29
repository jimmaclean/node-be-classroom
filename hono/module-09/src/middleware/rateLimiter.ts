import type { MiddlewareHandler } from "hono";

// NOTE: express-rate-limit does not work with Hono's fetch-based handler.
// Hono's core is runtime-agnostic — it doesn't use Node.js's http.IncomingMessage.
//
// This module implements a simple in-memory rate limiter as Hono middleware,
// demonstrating the same concepts (windowMs, max, RateLimit-* headers).
//
// For production, use a distributed store (Redis) and a Hono-compatible package
// like @hono/rate-limiter (Cloudflare Workers) or roll your own with ioredis.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter(
  windowMs: number,
  max: number,
  message?: object,
  keyGenerator?: (c: Parameters<MiddlewareHandler>[0]) => string
): MiddlewareHandler {
  // In-memory store — one Map per limiter instance
  const requests = new Map<string, RateLimitEntry>();

  return async (c, next) => {
    // Default key: IP address (same as express-rate-limit)
    const key = keyGenerator
      ? keyGenerator(c)
      : (c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown");

    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now > entry.resetAt) {
      // New window — reset the counter
      requests.set(key, { count: 1, resetAt: now + windowMs });
      c.header("RateLimit-Limit", String(max));
      c.header("RateLimit-Remaining", String(max - 1));
      c.header("RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));
      await next();
      return;
    }

    if (entry.count >= max) {
      c.header("RateLimit-Limit", String(max));
      c.header("RateLimit-Remaining", "0");
      c.header("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
      return c.json(message ?? { error: "Too many requests, please try again later." }, 429);
    }

    entry.count++;
    c.header("RateLimit-Limit", String(max));
    c.header("RateLimit-Remaining", String(max - entry.count));
    c.header("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));
    await next();
  };
}

// ─── Global rate limit ────────────────────────────────────
// Applied to all routes — protects against general abuse

export const globalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,            // max 100 requests per window per IP
  {
    error: "Too many requests, please try again later.",
    retryAfter: "15 minutes",
  }
);

// ─── Auth rate limit ──────────────────────────────────────
// Stricter limit on login/register — prevents brute force attacks

export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10,             // only 10 attempts per window (lower than global)
  {
    error: "Too many authentication attempts. Please wait 15 minutes.",
  }
);

// ─── API rate limit with custom key ──────────────────────
// Per-user rate limiting (when authenticated)

export const apiLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  30,        // 30 requests per minute
  undefined,
  // By default, rate limits are per IP.
  // For authenticated routes, limit per user ID instead:
  (c) => {
    // c.get("user") would be set by requireJWT middleware (Module 8)
    const user = c.get("user") as { sub?: number } | undefined;
    return user?.sub ? `user_${user.sub}` : (c.req.header("x-forwarded-for") ?? "unknown");
  }
);
