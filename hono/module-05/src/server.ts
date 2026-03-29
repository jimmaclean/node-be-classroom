import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { cacheFor, cachePrivate, noCache, etag, lastModified } from "./middleware/cache";

const app = new Hono();
const PORT = 3000;

app.use(logger());

// Seed data with a known "last modified" date
const POSTS_UPDATED_AT = new Date("2024-01-15T10:00:00Z");
const posts = [
  { id: 1, title: "Public post", body: "Anyone can cache this.", published: true },
  { id: 2, title: "Another post", body: "Also public.", published: true },
];

// ─────────────────────────────────────────────────────────
// SPRINT EXAMPLES — observe the Cache-Control header in each response
// ─────────────────────────────────────────────────────────

// Public data — cache for 60 seconds in browser AND CDNs
// NOTE: In Hono, middleware is chained as additional arguments to the route method
app.get("/public-data", cacheFor(60), (c) => {
  return c.json({ message: "This is public, cacheable for 60s", time: new Date().toISOString() });
});

// Private data — browser caches it but CDNs won't
app.get("/private-data", cachePrivate(30), (c) => {
  return c.json({ message: "This is private (browser-only cache)", user: "james" });
});

// Never cache — sensitive data
app.get("/sensitive-data", noCache, (c) => {
  return c.json({ message: "Never cache me", secret: "password123" });
});

// ─────────────────────────────────────────────────────────
// DEEP DIVE: ETag-based conditional requests
// ─────────────────────────────────────────────────────────

// Route-level etag middleware — only this route gets it
app.get("/posts", etag, (c) => {
  // Cache-Control: no-cache means "you CAN cache it, but MUST revalidate"
  // This works together with ETag: browser sends If-None-Match, gets 304 if unchanged
  c.header("Cache-Control", "no-cache");
  return c.json(posts);
});

// ─────────────────────────────────────────────────────────
// DEEP DIVE: Last-Modified-based conditional requests
// ─────────────────────────────────────────────────────────

app.get("/posts/by-date", lastModified(POSTS_UPDATED_AT), (c) => {
  c.header("Cache-Control", "no-cache");
  return c.json(posts);
});

// ─────────────────────────────────────────────────────────
// DEEP DIVE: Stale-while-revalidate — advanced pattern
//
// Browser uses cached copy immediately (fast) while fetching a fresh one
// in the background. Great for data that changes infrequently.
// ─────────────────────────────────────────────────────────

app.get("/news", (c) => {
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return c.json({
    articles: ["Breaking news...", "Another story..."],
    generatedAt: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────
// NO Cache-Control header set (the default)
// Browsers will use heuristic caching — unpredictable behaviour
// Always set Cache-Control explicitly in your APIs
// ─────────────────────────────────────────────────────────
app.get("/no-headers", (c) => {
  return c.json({
    message: "No Cache-Control set — browser decides what to cache",
    time: new Date().toISOString(),
  });
});

serve({ fetch: app.fetch, port: PORT });
console.log(`Server running at http://localhost:${PORT}`);
