import { Request, Response, NextFunction } from "express";

// This middleware protects routes that require a logged-in session.
// Place it before any route handler you want to protect.
//
// Usage:
//   router.get("/protected", requireAuth, handler)
//   app.use("/admin", requireAuth, adminRouter)

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "You must be logged in" });
    return;
  }
  next();
}
