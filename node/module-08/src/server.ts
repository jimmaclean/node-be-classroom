import "dotenv/config";
import express from "express";
import morgan from "morgan";
import { authRouter } from "./routes/auth";
import { requireJWT } from "./middleware/requireJWT";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(morgan("dev"));

app.use("/auth", authRouter);

// A protected resource requiring JWT auth
app.get("/protected", requireJWT, (req, res) => {
  res.json({
    message: "You're in!",
    authenticatedAs: req.user,
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Register at POST /auth/register, then use the access token as Bearer");
});
