import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt";

// Attach decoded token to req so route handlers can access it
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireJWT(req: Request, res: Response, next: NextFunction): void {
  // Tokens are sent in the Authorization header as a "Bearer token"
  // Format: "Authorization: Bearer eyJhbGc..."
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7); // remove "Bearer " prefix

  try {
    const payload = verifyAccessToken(token);
    req.user = payload; // attach to req for use in route handlers
    next();
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TokenExpiredError") {
        res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
        return;
      }
      if (err.name === "JsonWebTokenError") {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
    }
    next(err);
  }
}
