import { Hono } from "hono";
import { AppError } from "../middleware/errorHandler";

// NOTE: Hono uses new Hono() for sub-routers instead of express.Router().
// Mount it on the main app with app.route('/prefix', router) in server.ts.
const router = new Hono();

// GET /echo/:name
router.get("/:name", (c) => {
  const name = c.req.param("name");

  if (name.length < 2) {
    // Throwing from any route — sync or async — is caught by app.onError().
    // In Express 4, async handlers required next(err). Hono handles both automatically.
    throw new AppError(400, "Name must be at least 2 characters");
  }

  return c.json({
    params: { name },
    query: c.req.query(),
    body: {},
    // c.get() retrieves values stored by middleware earlier in the chain
    elapsedMs: Date.now() - (c.get("startTime") as number),
  });
});

// POST /echo
router.post("/", async (c) => {
  const body = await c.req.json();
  return c.json({
    method: c.req.method,
    body,
    headers: Object.fromEntries(c.req.raw.headers),
    elapsedMs: Date.now() - (c.get("startTime") as number),
  });
});

// Demonstrates: async error handling — in Hono, just throw.
// NOTE: No try/catch + next(err) needed. Hono catches rejected promises in routes
// automatically and forwards them to app.onError(). This is one improvement over
// Express 4 (Express 5 also fixed this, but 4 is still common).
router.get("/async-error/:shouldFail", async (c) => {
  if (c.req.param("shouldFail") === "yes") {
    throw new AppError(503, "Intentional async failure");
  }
  // Simulate async work (DB call, external API, etc.)
  await new Promise((resolve) => setTimeout(resolve, 50));
  return c.json({ message: "Async route succeeded" });
});

export { router as echoRouter };
