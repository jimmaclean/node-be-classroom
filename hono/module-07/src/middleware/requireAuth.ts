import type { MiddlewareHandler } from "hono";
import { getSession } from "./sessionMiddleware";

// This middleware protects routes that require a logged-in session.
// Place it before any route handler you want to protect.
//
// NOTE: Instead of reading from req.session, we read from context via getSession(c).
// The pattern is the same — check for a userId, return 401 if missing.
//
// Usage:
//   router.get("/protected", requireAuth, handler)
//   app.use("/admin", requireAuth, adminRouter)

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = getSession(c);
  if (!session.userId) {
    return c.json({ error: "You must be logged in" }, 401);
  }
  await next();
};
