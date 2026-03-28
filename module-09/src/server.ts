import "dotenv/config";
import express, { Request, Response } from "express";
import morgan from "morgan";
import { z } from "zod";
import { helmetMiddleware, corsMiddleware } from "./middleware/security";
import { globalLimiter, authLimiter } from "./middleware/rateLimiter";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ─── Security middleware — ORDER MATTERS ──────────────────

// 1. helmet — sets security headers before anything else
app.use(helmetMiddleware);

// 2. CORS — must come before routes so OPTIONS preflight is handled
app.use(corsMiddleware);

// 3. Body parsing
app.use(express.json({
  // Limit body size — prevent huge payloads crashing the server
  limit: "100kb",
}));

// 4. Logging
app.use(morgan("dev"));

// 5. Global rate limit — applies to everything
app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────

// Auth routes with stricter rate limiting
app.post("/auth/login", authLimiter, (req: Request, res: Response) => {
  // In reality: verify credentials. Here just demonstrating the limiter.
  res.json({ message: "Login endpoint (rate-limited to 10/15min)" });
});

app.post("/auth/register", authLimiter, (req: Request, res: Response) => {
  res.json({ message: "Register endpoint (rate-limited to 10/15min)" });
});

// ─── OWASP Demonstration Routes ───────────────────────────

// DEMONSTRATION: Mass assignment protection
// Never do: User.create(req.body) — user could send isAdmin: true
app.post("/users", (req: Request, res: Response) => {
  // BAD: spreads all of req.body into the DB call
  // const user = await User.create(req.body);  ← NEVER DO THIS

  // GOOD: use Zod to whitelist exactly what you accept
  const UserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    // notice: isAdmin, role, etc. are NOT here
  });

  const result = UserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ errors: result.error.issues });
    return;
  }

  // Only the validated fields make it through
  const { name, email } = result.data;
  res.status(201).json({ name, email, message: "Mass assignment prevented" });
});

// DEMONSTRATION: Helmet headers — check the response headers
app.get("/headers-check", (_req: Request, res: Response) => {
  res.json({
    message: "Check your DevTools or curl -I to see the security headers helmet added",
    headersToLookFor: [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Content-Security-Policy",
    ],
  });
});

// DEMONSTRATION: Rate limit headers
app.get("/rate-limit-check", (_req: Request, res: Response) => {
  res.json({
    message: "Hit this endpoint many times to trigger rate limiting",
    tip: "Watch for RateLimit-* headers counting down",
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Try: curl -I http://localhost:3000/headers-check");
});
