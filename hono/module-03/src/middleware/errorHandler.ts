import type { Context } from "hono";

// NOTE: Hono does not use a 4-argument middleware for error handling.
// Instead, register a handler with app.onError((err, c) => ...) in server.ts.
// Errors thrown from any route or middleware are caught automatically — including
// async errors — without needing next(err). See server.ts for registration.

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

// This function is passed to app.onError() — not app.use().
export function errorHandler(err: Error, c: Context): Response {
  console.error(`[Error] ${c.req.method} ${c.req.path} — ${err.message}`);

  if (err instanceof AppError) {
    return c.json(
      { error: err.message },
      err.statusCode as Parameters<Context["json"]>[1]
    );
  }

  // For unexpected errors, don't leak internal details to the client
  return c.json({ error: "Something went wrong" }, 500);
}
