import "dotenv/config";
import "reflect-metadata"; // required by sequelize-typescript decorators
import express from "express";
import morgan from "morgan";
import sequelize from "./db";
import { usersRouter } from "./routes/users";
import { postsRouter } from "./routes/posts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(morgan("dev"));

app.use("/users", usersRouter);
app.use("/posts", postsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

async function start() {
  // sync({ alter: true }) — updates existing tables to match current model definitions.
  // In production you'd use migrations instead (more controlled, reversible).
  // { force: true } would DROP and recreate tables — never use in production!
  await sequelize.sync({ alter: true });
  console.log("Database synced");

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
