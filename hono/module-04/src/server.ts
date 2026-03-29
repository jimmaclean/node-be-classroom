import "dotenv/config"; // must be first — loads .env into process.env
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { postsRouter } from "./routes/posts";

const app = new Hono();
// process.env values are always strings or undefined — provide a fallback
const PORT = Number(process.env.PORT) || 3000;

app.use(logger());

// Mount posts router
app.route("/posts", postsRouter);

// 404 fallback
app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

serve({ fetch: app.fetch, port: PORT });
console.log(`Server running at http://localhost:${PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
