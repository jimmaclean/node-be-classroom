import { Hono } from "hono";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeToken,
} from "../lib/jwt";
import { requireJWT } from "../middleware/requireJWT";
import type { AccessTokenPayload } from "../lib/jwt";

const router = new Hono();

// ─── In-memory user store (replace with DB in real app) ──

interface StoredUser {
  id: number;
  name: string;
  email: string;
  passwordHash: string; // NEVER store plaintext passwords
}

const users: StoredUser[] = [];
let nextId = 1;

// In-memory refresh token store (use Redis or DB in production)
const validRefreshTokens = new Set<string>();

// ─── Schemas ─────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── POST /auth/register ──────────────────────────────────

router.post("/register", async (c) => {
  const body = await c.req.json();
  const result = RegisterSchema.safeParse(body);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 422);
  }

  const { name, email, password } = result.data;

  if (users.some((u) => u.email === email)) {
    return c.json({ error: "Email already registered" }, 409);
  }

  // bcrypt.hash(plaintext, saltRounds)
  //   saltRounds (cost factor): determines how slow the hash is.
  //   12 = ~300ms per hash on a modern CPU. Slow = brute force is expensive.
  //   The salt is embedded in the hash string — no need to store separately.
  const passwordHash = await bcrypt.hash(password, 12);

  const user: StoredUser = { id: nextId++, name, email, passwordHash };
  users.push(user);

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);
  validRefreshTokens.add(refreshToken);

  return c.json({
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  }, 201);
});

// ─── POST /auth/login ─────────────────────────────────────

router.post("/login", async (c) => {
  const body = await c.req.json();
  const result = LoginSchema.safeParse(body);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 422);
  }

  const { email, password } = result.data;
  const user = users.find((u) => u.email === email);

  // bcrypt.compare() — timing-safe comparison
  //   Always compare even if user not found (prevent timing attacks)
  //   A timing attack: measuring response time to determine if email exists
  const DUMMY_HASH = "$2b$12$invalidhashfortimingnull.invalidhash";
  const isValid = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH
  );

  if (!user || !isValid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);
  validRefreshTokens.add(refreshToken);

  return c.json({
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,   // short-lived (15m) — used for API calls
    refreshToken,  // long-lived (7d) — used only to get new access tokens
  });
});

// ─── POST /auth/refresh ───────────────────────────────────
// Exchange a refresh token for a new access token

router.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json() as { refreshToken?: string };

  if (!refreshToken) {
    return c.json({ error: "refreshToken is required" }, 422);
  }

  // Check it's in our valid set (rotation / revocation)
  if (!validRefreshTokens.has(refreshToken)) {
    return c.json({ error: "Invalid or revoked refresh token" }, 401);
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = users.find((u) => u.id === payload.sub);

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    // Rotate the refresh token — invalidate the old one, issue a new one
    // This limits the damage if a refresh token is stolen
    validRefreshTokens.delete(refreshToken);
    const newRefreshToken = signRefreshToken(user.id);
    validRefreshTokens.add(newRefreshToken);

    const accessToken = signAccessToken(user.id, user.email);

    return c.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }
});

// ─── POST /auth/logout ────────────────────────────────────

router.post("/logout", requireJWT, async (c) => {
  const { refreshToken } = await c.req.json() as { refreshToken?: string };
  if (refreshToken) {
    validRefreshTokens.delete(refreshToken); // revoke it
  }
  return c.json({ message: "Logged out" });
});

// ─── GET /auth/me ─────────────────────────────────────────

router.get("/me", requireJWT, (c) => {
  // c.get("user") is set by requireJWT middleware
  // NOTE: In Express this was req.user — in Hono it's c.get("user")
  const currentUser = c.get("user") as AccessTokenPayload;
  const user = users.find((u) => u.id === currentUser.sub);

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ id: user.id, name: user.name, email: user.email });
});

// ─── GET /auth/decode — educational route (no verification!) ──

router.get("/decode", (c) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Send a JWT as Bearer token" }, 400);
  }

  const token = authHeader.slice(7);
  const decoded = decodeToken(token);

  return c.json({
    decoded,
    note: "This is NOT verified — anyone can read a JWT payload without the secret. Never trust decoded data without verifying first.",
  });
});

export { router as authRouter };
