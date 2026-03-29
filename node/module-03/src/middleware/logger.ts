import { Request, Response, NextFunction } from "express";

// A middleware function has this exact signature:
//   (req, res, next) => void
//
// - req: the incoming request (same object your route handlers see)
// - res: the outgoing response (same object your route handlers use)
// - next: a function — call it to pass control to the next middleware/route
//         if you DON'T call next(), the request hangs forever

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // We can't log the duration yet — the response hasn't been sent.
  // Instead, we hook into the 'finish' event on res, which fires
  // after the response has been fully sent to the client.
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Colour-code by status class for readability
    const colour =
      status >= 500 ? "\x1b[31m" :  // red
      status >= 400 ? "\x1b[33m" :  // yellow
      status >= 300 ? "\x1b[36m" :  // cyan
      "\x1b[32m";                    // green

    const reset = "\x1b[0m";

    console.log(
      `${colour}${req.method}${reset} ${req.path} → ${colour}${status}${reset} (${duration}ms)`
    );
  });

  // CRITICAL: always call next() or the request chain stops here
  next();
}
