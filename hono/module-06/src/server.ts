import "dotenv/config";
import "reflect-metadata"; // required by sequelize-typescript decorators
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import sequelize from "./db";
import { usersRouter } from "./routes/users";
import { postsRouter } from "./routes/posts";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;

app.use(logger());

app.route("/users", usersRouter);
app.route("/posts", postsRouter);

app.notFound((c) => {
  return c.json({ error: "Route not found" }, 404);
});

async function start() {
  // sync({ alter: true }) — updates existing tables to match current model definitions.
  // In production you'd use migrations instead (more controlled, reversible).
  // { force: true } would DROP and recreate tables — never use in production!
  await sequelize.sync({ alter: true });
  console.log("Database synced");

  serve({ fetch: app.fetch, port: PORT });
  console.log(`Server running at http://localhost:${PORT}`);
}

start().catch(console.error);
