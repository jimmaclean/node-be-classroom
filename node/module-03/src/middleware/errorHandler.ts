import { Request, Response, NextFunction } from "express";

// Error-handling middleware has a UNIQUE signature — 4 arguments.
// Express identifies it as an error handler specifically because of the
// 4th parameter. If you write (req, res, next) — 3 args — it's regular middleware.
//
// You activate it by calling next(error) from any middleware or route handler.

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

// This must be registered LAST — after all routes.
// Express skips it entirely for normal requests and only invokes it
// when next(err) is called.
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // next must be declared even if unused — Express checks the arity
  _next: NextFunction
): void {
  console.error(`[Error] ${req.method} ${req.path} — ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // For unexpected errors, don't leak internal details to the client
  res.status(500).json({
    error: "Something went wrong",
  });
}
