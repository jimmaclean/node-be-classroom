import type { MiddlewareHandler } from "hono";

// Demonstrates: attaching data to context so downstream middleware/routes can use it
//
// NOTE: In Hono there is no req object to add custom properties to.
// Instead, use c.set(key, value) to store data in the request context.
// Use c.get(key) to retrieve it in subsequent middleware or route handlers.
// This is type-safe when you define a Variables type on your Hono instance,
// but here we keep it simple with a string key.

export const attachStartTime: MiddlewareHandler = async (c, next) => {
  // c.set() stores a value in the request context — visible to all subsequent
  // middleware and route handlers in the chain.
  c.set("startTime", Date.now());
  await next();
};
