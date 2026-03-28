import "dotenv/config"; // must be first — loads .env into process.env
import express from "express";
import morgan from "morgan";
import { postsRouter } from "./routes/posts";

const app = express();
// process.env values are always strings or undefined — provide a fallback
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(morgan("dev"));

// Mount posts router
app.use("/posts", postsRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
});
