import "dotenv/config";
import express from "express";
import morgan from "morgan";
import { sessionMiddleware } from "./middleware/sessionMiddleware";
import { requireAuth } from "./middleware/requireAuth";
import { authRouter } from "./routes/auth";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(morgan("dev"));

// Session middleware — must come before any route that uses req.session
app.use(sessionMiddleware);

// Auth routes (login, logout, me)
app.use("/auth", authRouter);

// A protected resource — only accessible when logged in
app.get("/dashboard", requireAuth, (req, res) => {
  res.json({
    message: `Welcome back, user ${req.session.userId}`,
    data: { visits: req.session.loginCount },
  });
});

// Public route — no auth needed
app.get("/public", (_req, res) => {
  res.json({ message: "Anyone can see this" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
