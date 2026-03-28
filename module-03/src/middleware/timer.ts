import { Request, Response, NextFunction } from "express";

// Demonstrates: attaching data to req so downstream middleware/routes can use it
//
// TypeScript doesn't know about custom properties on req, so we extend
// the Express Request type via declaration merging (module augmentation).
declare global {
  namespace Express {
    interface Request {
      startTime: number;
    }
  }
}

export function attachStartTime(req: Request, _res: Response, next: NextFunction): void {
  // Any property you attach to req here is visible to all subsequent
  // middleware and route handlers in the chain.
  req.startTime = Date.now();
  next();
}
