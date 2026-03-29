import type { MiddlewareHandler } from "hono";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";

// NOTE: In Express, req.user was set via declaration merging on the Request type.
// In Hono, we use c.set("user", payload) and c.get("user") for the same purpose.

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Authentication required" }, 401);
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    c.set("user", payload); // available as c.get("user") in route handlers
    await next();
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      return c.json({ error: "Token expired", code: "TOKEN_EXPIRED" }, 401);
    }
    return c.json({ error: "Invalid token" }, 401);
  }
};
