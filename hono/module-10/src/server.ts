import "dotenv/config";
import "reflect-metadata";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import sequelize from "./db";
import { authRouter } from "./routes/auth";
import { bookmarksRouter } from "./routes/bookmarks";
import { createRateLimiter } from "./middleware/rateLimiter";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;

// ─── Security ─────────────────────────────────────────────
// NOTE: secureHeaders replaces helmet; cors is built into Hono
app.use(secureHeaders());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));

// ─── Logging ──────────────────────────────────────────────
// NOTE: logger() replaces morgan; built into Hono
app.use(logger());

// ─── Rate limiting ────────────────────────────────────────
// NOTE: express-rate-limit is replaced with a custom Hono middleware
// See middleware/rateLimiter.ts for details
const globalLimiter = createRateLimiter(15 * 60 * 1000, 100);
const authLimiter = createRateLimiter(15 * 60 * 1000, 10, {
  error: "Too many auth attempts. Please wait 15 minutes.",
});

app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────
app.use("/auth/register", authLimiter);
app.use("/auth/login", authLimiter);
app.route("/auth", authRouter);
app.route("/bookmarks", bookmarksRouter);

// Health check — useful for deployment/monitoring
app.get("/health", (c) => {
  return c.json({ status: "ok", uptime: process.uptime() });
});

// ─── 404 ──────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

// ─── Error handler ────────────────────────────────────────
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

// ─── Start ────────────────────────────────────────────────
async function start() {
  await sequelize.sync({ alter: true });
  console.log("Database synced");

  serve({ fetch: app.fetch, port: PORT });
  console.log(`\nReads API running at http://localhost:${PORT}`);
  console.log("POST /auth/register → create an account");
  console.log("POST /auth/login    → get your JWT");
  console.log("GET  /bookmarks     → list your bookmarks\n");
}

start().catch(console.error);
