import { Request, Response, NextFunction } from "express";
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
export function cacheFor(seconds: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set("Cache-Control", `public, max-age=${seconds}`);
    next();
  };
}

/**
 * Mark a response as private — only the browser cache should store it.
 * CDNs (Cloudflare, etc.) will NOT cache this.
 *
 * Use this for user-specific data (profile page, dashboard, etc.)
 */
export function cachePrivate(seconds: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set("Cache-Control", `private, max-age=${seconds}`);
    next();
  };
}

/**
 * Tell caches NEVER to store this response.
 * Use this for authenticated or sensitive data.
 *
 * no-store = don't store at all (strongest)
 * no-cache = can store but must revalidate before using (weaker)
 */
export function noCache(_req: Request, res: Response, next: NextFunction): void {
  res.set("Cache-Control", "no-store");
  next();
}

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
 * How it works:
 *  1. We intercept res.json() to get the response body before it's sent
 *  2. We compute an MD5 hash of the body as the ETag
 *  3. If the client sent If-None-Match with the same ETag → 304
 *  4. Otherwise → 200 with the body and ETag header set
 */
export function etag(req: Request, res: Response, next: NextFunction): void {
  // Monkey-patch res.json to intercept the body before sending
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    const serialized = JSON.stringify(body);
    const hash = crypto.createHash("md5").update(serialized).digest("hex");
    const etagValue = `"${hash}"`; // ETags must be quoted strings

    res.set("ETag", etagValue);

    // Check if client sent If-None-Match with our ETag
    const clientEtag = req.headers["if-none-match"];
    if (clientEtag === etagValue) {
      // Content hasn't changed — send 304 with no body
      // This saves the client from downloading data it already has
      res.status(304).send();
      return res;
    }

    // Content changed (or first request) — send full response
    return originalJson(body);
  };

  next();
}

// ─────────────────────────────────────────────────────────
// Last-Modified — time-based conditional requests
//
// Alternative to ETag: use a timestamp instead of a hash.
// The client sends If-Modified-Since on subsequent requests.
// ─────────────────────────────────────────────────────────

export function lastModified(date: Date) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const lastModifiedStr = date.toUTCString();
    res.set("Last-Modified", lastModifiedStr);

    const ifModifiedSince = req.headers["if-modified-since"];
    if (ifModifiedSince) {
      const clientDate = new Date(ifModifiedSince);
      if (date <= clientDate) {
        res.status(304).send();
        return;
      }
    }

    next();
  };
}
