import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";

// express.Router() creates a mini-application — a self-contained
// set of routes and middleware. The main app mounts it at a prefix.
// This is how you keep a large codebase from becoming one giant file.
const router = Router();

// GET /echo/:name
router.get("/:name", (req: Request, res: Response) => {
  const { name } = req.params;

  if (name.length < 2) {
    // Throwing from a synchronous handler is caught by Express
    // and forwarded to the error handler automatically.
    // For async handlers you must use next(err) — see below.
    throw new AppError(400, "Name must be at least 2 characters");
  }

  res.json({
    params: req.params,
    query: req.query,
    body: req.body,
    // req.startTime is attached by our timer middleware (see server.ts)
    elapsedMs: Date.now() - req.startTime,
  });
});

// POST /echo
router.post("/", (req: Request, res: Response) => {
  res.json({
    method: req.method,
    body: req.body,
    headers: req.headers,
    elapsedMs: Date.now() - req.startTime,
  });
});

// Demonstrates: async error handling — you MUST call next(err)
// because Express can't catch rejected promises automatically
// in Express 4 (Express 5 handles this, but 4 is still common)
router.get("/async-error/:shouldFail", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.shouldFail === "yes") {
      throw new AppError(503, "Intentional async failure");
    }
    // Simulate async work (DB call, external API, etc.)
    await new Promise((resolve) => setTimeout(resolve, 50));
    res.json({ message: "Async route succeeded" });
  } catch (err) {
    // In Express 4, caught errors from async code must be passed to next()
    next(err);
  }
});

export { router as echoRouter };
