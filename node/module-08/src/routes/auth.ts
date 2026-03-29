import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  decodeToken,
} from "../lib/jwt";
import { requireJWT } from "../middleware/requireJWT";

const router = Router();

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

router.post("/register", async (req: Request, res: Response) => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ errors: result.error.issues });
    return;
  }

  const { name, email, password } = result.data;

  if (users.some((u) => u.email === email)) {
    res.status(409).json({ error: "Email already registered" });
    return;
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

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  });
});

// ─── POST /auth/login ─────────────────────────────────────

router.post("/login", async (req: Request, res: Response) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ errors: result.error.issues });
    return;
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
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);
  validRefreshTokens.add(refreshToken);

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    accessToken,   // short-lived (15m) — used for API calls
    refreshToken,  // long-lived (7d) — used only to get new access tokens
  });
});

// ─── POST /auth/refresh ───────────────────────────────────
// Exchange a refresh token for a new access token

router.post("/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(422).json({ error: "refreshToken is required" });
    return;
  }

  // Check it's in our valid set (rotation / revocation)
  if (!validRefreshTokens.has(refreshToken)) {
    res.status(401).json({ error: "Invalid or revoked refresh token" });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = users.find((u) => u.id === payload.sub);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Rotate the refresh token — invalidate the old one, issue a new one
    // This limits the damage if a refresh token is stolen
    validRefreshTokens.delete(refreshToken);
    const newRefreshToken = signRefreshToken(user.id);
    validRefreshTokens.add(newRefreshToken);

    const accessToken = signAccessToken(user.id, user.email);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// ─── POST /auth/logout ────────────────────────────────────

router.post("/logout", requireJWT, (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) {
    validRefreshTokens.delete(refreshToken); // revoke it
  }
  res.json({ message: "Logged out" });
});

// ─── GET /auth/me ─────────────────────────────────────────

router.get("/me", requireJWT, (req: Request, res: Response) => {
  // req.user is set by requireJWT middleware
  const user = users.find((u) => u.id === req.user!.sub);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, name: user.name, email: user.email });
});

// ─── GET /auth/decode — educational route (no verification!) ──

router.get("/decode", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(400).json({ error: "Send a JWT as Bearer token" });
    return;
  }

  const token = authHeader.slice(7);
  const decoded = decodeToken(token);

  res.json({
    decoded,
    note: "This is NOT verified — anyone can read a JWT payload without the secret. Never trust decoded data without verifying first.",
  });
});

export { router as authRouter };
