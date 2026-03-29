import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { sessionMiddleware } from "./middleware/sessionMiddleware";
import { requireAuth } from "./middleware/requireAuth";
import { getSession } from "./middleware/sessionMiddleware";
import { authRouter } from "./routes/auth";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;

app.use(logger());

// Session middleware — must come before any route that uses the session
// NOTE: This replaces express-session. See sessionMiddleware.ts for details.
app.use(sessionMiddleware);

// Auth routes (login, logout, me)
app.route("/auth", authRouter);

// A protected resource — only accessible when logged in
app.get("/dashboard", requireAuth, (c) => {
  const session = getSession(c);
  return c.json({
    message: `Welcome back, user ${session.userId}`,
    data: { visits: session.loginCount },
  });
});

// Public route — no auth needed
app.get("/public", (c) => {
  return c.json({ message: "Anyone can see this" });
});

app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

serve({ fetch: app.fetch, port: PORT });
console.log(`Server running at http://localhost:${PORT}`);
