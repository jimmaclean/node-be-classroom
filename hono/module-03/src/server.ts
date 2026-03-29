import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger as honoLogger } from "hono/logger";
import { cors } from "hono/cors";

import { requestLogger } from "./middleware/logger";
import { attachStartTime } from "./middleware/timer";
import { errorHandler } from "./middleware/errorHandler";
import { echoRouter } from "./routes/echo";

const app = new Hono();
const PORT = 3000;

// ─────────────────────────────────────────────────────────
// MIDDLEWARE ORDER MATTERS — read this top to bottom as a pipeline
// Every request flows through middleware in registration order
// ─────────────────────────────────────────────────────────

// NOTE: No express.json() needed. Hono parses bodies lazily via c.req.json().

// 1. CORS — tells browsers which origins are allowed to call this API
//    NOTE: Hono has cors built in via "hono/cors" — no separate package needed
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend dev server (Vite default)
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// 2. Hono's built-in logger (replaces morgan)
//    NOTE: "hono/logger" is built into Hono — no separate morgan package needed
//    Format: --> GET /hello   <-- GET /hello 200 4ms
app.use(honoLogger());

// 3. Our custom middleware — attaches startTime to context
app.use(attachStartTime);

// 4. Our custom logger — uses async middleware pattern (no 'finish' event needed)
app.use(requestLogger);

// ─────────────────────────────────────────────────────────
// ROUTES — mounted after middleware so all middleware runs first
// ─────────────────────────────────────────────────────────

// Mount the echo router at /echo — app.route() replaces app.use() for sub-routers
app.route("/echo", echoRouter);

// A route that intentionally throws to demonstrate the error handler
app.get("/crash", () => {
  throw new Error("Intentional crash to demonstrate error handling");
});

// ─────────────────────────────────────────────────────────
// 404 HANDLER — app.notFound() replaces the catch-all middleware pattern
// ─────────────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

// ─────────────────────────────────────────────────────────
// ERROR HANDLER — app.onError() replaces the 4-param Express error handler
// Catches any thrown error from routes or middleware
// ─────────────────────────────────────────────────────────
app.onError(errorHandler);

serve({ fetch: app.fetch, port: PORT });
console.log(`Server running at http://localhost:${PORT}`);
