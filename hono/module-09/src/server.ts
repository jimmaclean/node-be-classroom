import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { z } from "zod";
import { helmetMiddleware, corsMiddleware } from "./middleware/security";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;

// ─── Security middleware — ORDER MATTERS ──────────────────

// 1. secureHeaders — sets security headers before anything else
//    NOTE: replaces the helmet npm package; see middleware/security.ts
app.use(helmetMiddleware);

// 2. CORS — must come before routes so OPTIONS preflight is handled
//    NOTE: replaces the cors npm package; see middleware/security.ts
app.use(corsMiddleware);

// 3. Logging
//    NOTE: replaces morgan; built into Hono via "hono/logger"
app.use(logger());

// 4. Global rate limit — applies to everything
//    NOTE: replaces express-rate-limit; see middleware/rateLimiter.ts
app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────

// Auth routes with stricter rate limiting
app.post("/auth/login", authLimiter, (c) => {
  // In reality: verify credentials. Here just demonstrating the limiter.
  return c.json({ message: "Login endpoint (rate-limited to 10/15min)" });
});

app.post("/auth/register", authLimiter, (c) => {
  return c.json({ message: "Register endpoint (rate-limited to 10/15min)" });
});

// ─── OWASP Demonstration Routes ───────────────────────────

// DEMONSTRATION: Mass assignment protection
// Never do: User.create(c.req.json()) — user could send isAdmin: true
app.post("/users", async (c) => {
  // BAD: spreads all of body into the DB call
  // const user = await User.create(await c.req.json());  ← NEVER DO THIS

  // GOOD: use Zod to whitelist exactly what you accept
  const UserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    // notice: isAdmin, role, etc. are NOT here
  });

  const body = await c.req.json();
  const result = UserSchema.safeParse(body);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 422);
  }

  // Only the validated fields make it through
  const { name, email } = result.data;
  return c.json({ name, email, message: "Mass assignment prevented" }, 201);
});

// DEMONSTRATION: secureHeaders — check the response headers
app.get("/headers-check", (c) => {
  return c.json({
    message: "Check your DevTools or curl -I to see the security headers secureHeaders added",
    headersToLookFor: [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Content-Security-Policy",
    ],
  });
});

// DEMONSTRATION: Rate limit headers
app.get("/rate-limit-check", (c) => {
  return c.json({
    message: "Hit this endpoint many times to trigger rate limiting",
    tip: "Watch for RateLimit-* headers counting down",
  });
});

app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

serve({ fetch: app.fetch, port: PORT });
console.log(`Server running at http://localhost:${PORT}`);
console.log("Try: curl -I http://localhost:3000/headers-check");
