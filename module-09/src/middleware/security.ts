import helmet from "helmet";
import cors from "cors";

// ─── helmet ───────────────────────────────────────────────
//
// helmet sets ~15 security-related HTTP response headers in one call.
// Each prevents a specific class of attack.
//
// Run WITHOUT helmet first, then add it, and compare headers with:
//   curl -I http://localhost:3000/

export const helmetMiddleware = helmet({
  // Content-Security-Policy: tells browsers which sources are allowed
  // to load scripts, styles, images, etc. Prevents XSS.
  // The default CSP is strict — you may need to relax it for your frontend.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },

  // X-Frame-Options: DENY — prevents your page from being embedded in an iframe
  // Blocks clickjacking attacks
  frameguard: { action: "deny" },

  // X-Content-Type-Options: nosniff — prevents browsers from guessing content type
  // Without this, a browser might execute a .txt file as JavaScript
  noSniff: true,

  // Strict-Transport-Security (HSTS) — forces HTTPS for a year
  // Only send in production (not localhost)
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,

  // Referrer-Policy: no-referrer — don't leak your URL to other sites
  referrerPolicy: { policy: "no-referrer" },
});

// ─── CORS ─────────────────────────────────────────────────
//
// Only allow requests from your actual frontend.
// In development: localhost:5173 (Vite) or localhost:3001 (CRA)
// In production: your actual domain

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies to be sent cross-origin
});
