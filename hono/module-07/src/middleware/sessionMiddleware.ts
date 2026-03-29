import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import crypto from "node:crypto";

// NOTE: Hono does not have a built-in equivalent to express-session.
// express-session is tightly coupled to Node.js's http.IncomingMessage (req).
// Hono's core is runtime-agnostic (Bun, Deno, Cloudflare Workers) so it cannot
// embed a Node.js-specific session store.
//
// This module implements the same concepts manually:
//   1. Generate a random session ID (like express-session)
//   2. Send it to the browser as a signed cookie (Set-Cookie)
//   3. Store session DATA server-side, keyed by the session ID
//   4. On subsequent requests: read the cookie, look up the data
//
// For production with Hono on Node.js, use a package like "hono-sessions"
// or roll your own with a Redis/DB-backed store.

export interface SessionData {
  userId?: number;
  email?: string;
  loginCount?: number;
}

const SESSION_COOKIE = "sid";

// Server-side session store — data lives here, NOT in the cookie
// (same as Express MemoryStore)
const store = new Map<string, SessionData>();

function generateSessionId(): string {
  return crypto.randomBytes(24).toString("hex");
}

// ─────────────────────────────────────────────────────────
// sessionMiddleware — loads session data into context for this request
// ─────────────────────────────────────────────────────────

export const sessionMiddleware: MiddlewareHandler = async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE) ?? "";
  const session: SessionData = sessionId ? (store.get(sessionId) ?? {}) : {};

  // Store session data in context so routes can read/write it
  c.set("session", session);
  c.set("sessionId", sessionId);

  await next();
};

// ─────────────────────────────────────────────────────────
// saveSession — persists session changes and sets the cookie
//
// NOTE: In express-session, req.session is a Proxy that auto-saves on res.end().
// In Hono we must call saveSession() explicitly after mutating session data.
// ─────────────────────────────────────────────────────────

export function saveSession(c: Parameters<MiddlewareHandler>[0], data: SessionData): void {
  let id = c.get("sessionId") as string;
  if (!id) {
    id = generateSessionId();
    c.set("sessionId", id);
  }

  store.set(id, data);
  c.set("session", data);

  setCookie(c, SESSION_COOKIE, id, {
    // httpOnly: true — JavaScript cannot read this cookie (document.cookie)
    // Prevents XSS attacks from stealing sessions
    httpOnly: true,

    // secure: true — only send over HTTPS
    // Must be false in development (we're using http://localhost)
    secure: process.env.NODE_ENV === "production",

    // sameSite: "Lax" — cookie sent with same-site navigations and safe cross-site GET
    // Prevents CSRF attacks.
    sameSite: "Lax",

    // maxAge: how long (seconds) until the cookie expires
    // NOTE: express-session uses maxAge in milliseconds; hono/cookie uses seconds
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

// ─────────────────────────────────────────────────────────
// destroySession — removes session from store and clears the cookie
// Equivalent to req.session.destroy() in express-session
// ─────────────────────────────────────────────────────────

export function destroySession(c: Parameters<MiddlewareHandler>[0]): void {
  const id = c.get("sessionId") as string;
  if (id) {
    store.delete(id);
  }
  deleteCookie(c, SESSION_COOKIE);
  c.set("session", {});
  c.set("sessionId", "");
}

// ─────────────────────────────────────────────────────────
// getSession — type-safe helper to read the current session
// Equivalent to req.session in express-session
// ─────────────────────────────────────────────────────────

export function getSession(c: Parameters<MiddlewareHandler>[0]): SessionData {
  return (c.get("session") as SessionData) ?? {};
}
