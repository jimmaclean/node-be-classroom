import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";

// ─── secureHeaders ────────────────────────────────────────
//
// NOTE: Hono has secure-headers built in via "hono/secure-headers".
// It replaces the helmet package and needs no separate npm install.
// It sets the same security-related HTTP response headers.
//
// Run WITHOUT secureHeaders first, then add it, and compare headers with:
//   curl -I http://localhost:3000/

export const helmetMiddleware = secureHeaders({
  // Content-Security-Policy: tells browsers which sources are allowed
  // to load scripts, styles, images, etc. Prevents XSS.
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
  },

  // X-Frame-Options: DENY — prevents your page being embedded in an iframe
  // Blocks clickjacking attacks
  xFrameOptions: "DENY",

  // X-Content-Type-Options: nosniff — prevents browsers from guessing content type
  xContentTypeOptions: "nosniff",

  // Strict-Transport-Security (HSTS) — forces HTTPS for a year
  // NOTE: hono/secure-headers uses strictTransportSecurity instead of hsts
  strictTransportSecurity: process.env.NODE_ENV === "production"
    ? "max-age=31536000; includeSubDomains"
    : "",

  // Referrer-Policy: no-referrer — don't leak your URL to other sites
  referrerPolicy: "no-referrer",
});

// ─── CORS ─────────────────────────────────────────────────
//
// NOTE: Hono has cors built in via "hono/cors" — no separate package needed.
// The API is similar to the cors npm package.
//
// Only allow requests from your actual frontend.

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

export const corsMiddleware = cors({
  origin: (origin) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return origin;
    // NOTE: In hono/cors, the origin function returns the allowed origin string
    // or undefined to block — slightly different from the cors npm callback style
    return allowedOrigins.includes(origin) ? origin : undefined;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies to be sent cross-origin
});
