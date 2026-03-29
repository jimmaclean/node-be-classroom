import type { MiddlewareHandler } from "hono";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────
// Cache-Control header helpers
//
// Cache-Control is an instruction to caches (browser, CDN, proxy).
// You set it in the *response* to tell caches what they can do.
// ─────────────────────────────────────────────────────────

/**
 * Tell the browser (and CDNs) to cache the response for `seconds` seconds.
 *
 * Cache-Control: public, max-age=N
 *   public  = any cache (browser + CDN) can store it
 *   max-age = seconds until the cached copy is considered stale
 */
export function cacheFor(seconds: number): MiddlewareHandler {
  // NOTE: In Hono, middleware headers set before next() are response headers.
  // c.header() is equivalent to res.set() in Express.
  return async (c, next) => {
    await next();
    c.res.headers.set("Cache-Control", `public, max-age=${seconds}`);
  };
}

/**
 * Mark a response as private — only the browser cache should store it.
 * CDNs (Cloudflare, etc.) will NOT cache this.
 *
 * Use this for user-specific data (profile page, dashboard, etc.)
 */
export function cachePrivate(seconds: number): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.res.headers.set("Cache-Control", `private, max-age=${seconds}`);
  };
}

/**
 * Tell caches NEVER to store this response.
 * Use this for authenticated or sensitive data.
 *
 * no-store = don't store at all (strongest)
 * no-cache = can store but must revalidate before using (weaker)
 */
export const noCache: MiddlewareHandler = async (c, next) => {
  await next();
  c.res.headers.set("Cache-Control", "no-store");
};

// ─────────────────────────────────────────────────────────
// ETag — conditional requests
//
// An ETag is a fingerprint of the response body.
// The client stores it and sends it back on the next request.
// If the content hasn't changed, the server returns 304 (Not Modified)
// and the client uses its cached copy — saving bandwidth.
// ─────────────────────────────────────────────────────────

/**
 * Middleware that computes an ETag for the response body and handles
 * conditional requests (If-None-Match → 304 Not Modified).
 *
 * NOTE: In Hono, we await next() first, then inspect/modify c.res.
 * This is cleaner than Express's monkey-patching of res.json().
 */
export const etag: MiddlewareHandler = async (c, next) => {
  await next();

  // After next(), the response body is available via c.res
  const body = await c.res.clone().text();
  const hash = crypto.createHash("md5").update(body).digest("hex");
  const etagValue = `"${hash}"`; // ETags must be quoted strings

  c.res.headers.set("ETag", etagValue);

  // Check if client sent If-None-Match with our ETag
  const clientEtag = c.req.header("if-none-match");
  if (clientEtag === etagValue) {
    // Content hasn't changed — replace the response with a 304 (no body)
    // This saves the client from downloading data it already has
    c.res = new Response(null, { status: 304 });
  }
};

// ─────────────────────────────────────────────────────────
// Last-Modified — time-based conditional requests
//
// Alternative to ETag: use a timestamp instead of a hash.
// The client sends If-Modified-Since on subsequent requests.
// ─────────────────────────────────────────────────────────

export function lastModified(date: Date): MiddlewareHandler {
  return async (c, next) => {
    const lastModifiedStr = date.toUTCString();

    const ifModifiedSince = c.req.header("if-modified-since");
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      if (date <= clientDate) {
        // No changes since the client's copy — return 304 before running route
        c.res = new Response(null, { status: 304 });
        return;
      }
    }

    await next();
    c.res.headers.set("Last-Modified", lastModifiedStr);
  };
}
