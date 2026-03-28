import session from "express-session";

// Extend the session data type so TypeScript knows about our custom properties
declare module "express-session" {
  interface SessionData {
    userId: number;
    email: string;
    loginCount: number;
  }
}

// express-session handles:
//  1. Generating a unique session ID (a random string like "s%3Axyz...")
//  2. Sending it to the browser as a cookie (Set-Cookie header)
//  3. Storing the session DATA server-side (keyed by that ID)
//  4. On subsequent requests: reading the cookie, looking up the session data
//
// The browser only sees the session ID — never the actual data.

export const sessionMiddleware = session({
  // secret: used to sign the session ID cookie, preventing tampering
  // In production: use a long random string from an env var
  secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",

  // resave: false — don't save the session if nothing changed
  resave: false,

  // saveUninitialized: false — don't create a session until data is stored
  // (GDPR-friendly: no cookie sent to users who haven't logged in)
  saveUninitialized: false,

  cookie: {
    // httpOnly: true — JavaScript cannot read this cookie (document.cookie)
    // Prevents XSS attacks from stealing sessions
    httpOnly: true,

    // secure: true — only send over HTTPS
    // Must be false in development (we're using http://localhost)
    secure: process.env.NODE_ENV === "production",

    // sameSite: "lax" — cookie sent with same-site navigations and safe cross-site GET
    // Prevents CSRF attacks. "strict" is stronger but breaks some flows.
    sameSite: "lax",

    // maxAge: how long (ms) until the cookie expires
    // 24 hours = 1000ms * 60s * 60min * 24h
    maxAge: 1000 * 60 * 60 * 24,
  },

  // store: where sessions are stored server-side
  // Default: MemoryStore (in-process memory) — data lost on restart
  // Production: use connect-pg-simple, connect-redis, etc.
  // store: new PgStore({ ... })  ← we'd add this in a real app
});
