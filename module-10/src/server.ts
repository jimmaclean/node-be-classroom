import "dotenv/config";
import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import sequelize from "./db";
import { authRouter } from "./routes/auth";
import { bookmarksRouter } from "./routes/bookmarks";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ─── Security ─────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");
app.use(cors({ origin: allowedOrigins, credentials: true }));

// ─── Body parsing ─────────────────────────────────────────
app.use(express.json({ limit: "50kb" }));

// ─── Logging ──────────────────────────────────────────────
app.use(morgan("dev"));

// ─── Rate limiting ────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please wait 15 minutes." },
});

app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────
app.use("/auth/register", authLimiter);
app.use("/auth/login", authLimiter);
app.use("/auth", authRouter);
app.use("/bookmarks", bookmarksRouter);

// Health check — useful for deployment/monitoring
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── 404 ──────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Error handler ────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────
async function start() {
  await sequelize.sync({ alter: true });
  console.log("Database synced");

  app.listen(PORT, () => {
    console.log(`\n🔖 Reads API running at http://localhost:${PORT}`);
    console.log("POST /auth/register → create an account");
    console.log("POST /auth/login    → get your JWT");
    console.log("GET  /bookmarks     → list your bookmarks\n");
  });
}

start().catch(console.error);
