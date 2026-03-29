import type { MiddlewareHandler } from "hono";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";

// NOTE: In Express, decoded token data was attached to req.user via declaration merging.
// In Hono, we use c.set("user", payload) to store it in the request context,
// and c.get("user") to retrieve it in route handlers.

export const requireJWT: MiddlewareHandler = async (c, next) => {
  // Tokens are sent in the Authorization header as a "Bearer token"
  // Format: "Authorization: Bearer eyJhbGc..."
  const authHeader = c.req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or malformed Authorization header" }, 401);
  }

  const token = authHeader.slice(7); // remove "Bearer " prefix

  try {
    const payload = verifyAccessToken(token);
    c.set("user", payload); // attach to context for use in route handlers
    await next();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TokenExpiredError") {
        return c.json({ error: "Token expired", code: "TOKEN_EXPIRED" }, 401);
      }
      if (err.name === "JsonWebTokenError") {
        return c.json({ error: "Invalid token" }, 401);
      }
    }
    throw err;
  }
};
