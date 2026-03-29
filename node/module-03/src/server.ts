import express from "express";
import morgan from "morgan";
import cors from "cors";

import { requestLogger } from "./middleware/logger";
import { attachStartTime } from "./middleware/timer";
import { errorHandler } from "./middleware/errorHandler";
import { echoRouter } from "./routes/echo";

const app = express();
const PORT = 3000;

// ─────────────────────────────────────────────────────────
// MIDDLEWARE ORDER MATTERS — read this top to bottom as a pipeline
// Every request flows through middleware in registration order
// ─────────────────────────────────────────────────────────

// 1. Parse JSON bodies — must come before any route that reads req.body
app.use(express.json());

// 2. CORS — tells browsers which origins are allowed to call this API
//    Without this, browser requests from a different origin are blocked
//    by the browser's same-origin policy (curl is not affected)
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend dev server (Vite default)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 3. morgan — third-party request logger (more production-ready than our custom one)
//    'dev' format: GET /hello 200 4.321 ms - 27
//    Try other formats: 'tiny', 'common', 'combined'
app.use(morgan("dev"));

// 4. Our custom middleware — attaches startTime to req
app.use(attachStartTime);

// 5. Our custom logger — uses the res 'finish' event to log after response sent
app.use(requestLogger);

// ─────────────────────────────────────────────────────────
// ROUTES — mounted after middleware so all middleware runs first
// ─────────────────────────────────────────────────────────

// Mount the echo router at /echo — all routes inside are prefixed
// e.g. router.get("/:name") becomes GET /echo/:name
app.use("/echo", echoRouter);

// A route that intentionally throws to demonstrate the error handler
app.get("/crash", (_req, _res) => {
  throw new Error("Intentional crash to demonstrate error handling");
});

// ─────────────────────────────────────────────────────────
// 404 HANDLER — catches any request that didn't match a route above
// This is just regular middleware placed after all routes
// ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─────────────────────────────────────────────────────────
// ERROR HANDLER — must be last, must have 4 params
// Only activated by next(err) or a thrown error in sync routes
// ─────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
