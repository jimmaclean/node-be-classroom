import rateLimit from "express-rate-limit";

// ─── Global rate limit ────────────────────────────────────
// Applied to all routes — protects against general abuse

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per window per IP
  standardHeaders: "draft-7", // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,

  message: {
    error: "Too many requests, please try again later.",
    retryAfter: "15 minutes",
  },
});

// ─── Auth rate limit ──────────────────────────────────────
// Stricter limit on login/register — prevents brute force attacks

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // only 10 attempts per window (lower than global)
  standardHeaders: "draft-7",
  legacyHeaders: false,

  message: {
    error: "Too many authentication attempts. Please wait 15 minutes.",
  },

  // Skip counting successful requests — only penalize failed ones
  // (Commented out for learning purposes — in prod you'd want this)
  // skip: (req, res) => res.statusCode < 400,
});

// ─── API rate limit with custom key ──────────────────────
// Per-user rate limiting (when authenticated)

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 requests per minute

  // By default, rate limits are per IP.
  // For authenticated routes, limit per user ID instead:
  keyGenerator: (req) => {
    // req.user would be set by requireJWT middleware (Module 8)
    const userId = (req as { user?: { sub?: number } }).user?.sub;
    return userId ? `user_${userId}` : req.ip ?? "unknown";
  },

  standardHeaders: "draft-7",
  legacyHeaders: false,
});
