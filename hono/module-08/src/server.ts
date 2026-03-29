import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { authRouter } from "./routes/auth";
import { requireJWT } from "./middleware/requireJWT";
import type { AccessTokenPayload } from "./lib/jwt";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;

app.use(logger());

app.route("/auth", authRouter);

// A protected resource requiring JWT auth
app.get("/protected", requireJWT, (c) => {
  // NOTE: In Express this was req.user — in Hono it's c.get("user")
  return c.json({
    message: "You're in!",
    authenticatedAs: c.get("user") as AccessTokenPayload,
  });
});

app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

serve({ fetch: app.fetch, port: PORT });
console.log(`Server running at http://localhost:${PORT}`);
console.log("Register at POST /auth/register, then use the access token as Bearer");
