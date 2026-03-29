import type { MiddlewareHandler } from "hono";

// A middleware function in Hono has this signature:
//   async (c, next) => void
//
// - c: the Context object (wraps both request and response)
// - next: an async function — await it to pass control to the next handler
//         if you DON'T await next(), the request chain stops here
//
// NOTE: Unlike Express, Hono middleware is async and uses await next() instead of
// calling next(). This means you can run code AFTER the response is sent by placing
// it after `await next()` — no need for res.on('finish', ...) event listeners.

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();

  // Pass control to the next middleware/route handler
  await next();

  // Code here runs AFTER the response has been produced.
  // In Hono, this is the natural place to log — no 'finish' event needed.
  const duration = Date.now() - start;
  const status = c.res.status;

  // Colour-code by status class for readability
  const colour =
    status >= 500 ? "\x1b[31m" :  // red
    status >= 400 ? "\x1b[33m" :  // yellow
    status >= 300 ? "\x1b[36m" :  // cyan
    "\x1b[32m";                    // green

  const reset = "\x1b[0m";

  console.log(
    `${colour}${c.req.method}${reset} ${c.req.path} → ${colour}${status}${reset} (${duration}ms)`
  );
};
