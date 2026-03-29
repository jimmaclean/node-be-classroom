import { Hono } from "hono";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { requireAuth } from "../middleware/requireAuth";
import type { AccessTokenPayload } from "../lib/jwt";

const router = new Hono();
const refreshTokenStore = new Set<string>();

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (c) => {
  const body = await c.req.json();
  const result = RegisterSchema.safeParse(body);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 422);
  }

  const { name, email, password } = result.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);
    refreshTokenStore.add(refreshToken);

    return c.json({
      user: user.toJSON(),
      accessToken,
      refreshToken,
    }, 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "SequelizeUniqueConstraintError") {
      return c.json({ error: "Email already registered" }, 409);
    }
    throw err;
  }
});

router.post("/login", async (c) => {
  const body = await c.req.json();
  const result = LoginSchema.safeParse(body);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 422);
  }

  const { email, password } = result.data;
  const user = await User.findOne({ where: { email } });

  const DUMMY = "$2b$12$invalidhashfortimingnull.invalidhash";
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);

  if (!user || !valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);
  refreshTokenStore.add(refreshToken);

  return c.json({ user: user.toJSON(), accessToken, refreshToken });
});

router.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json() as { refreshToken?: string };

  if (!refreshToken || !refreshTokenStore.has(refreshToken)) {
    return c.json({ error: "Invalid refresh token" }, 401);
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    refreshTokenStore.delete(refreshToken);

    const newRefreshToken = signRefreshToken(payload.sub);
    refreshTokenStore.add(newRefreshToken);

    // We need the email for the access token — fetch the user
    const user = await User.findByPk(payload.sub);
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }
    return c.json({
      accessToken: signAccessToken(user.id, user.email),
      refreshToken: newRefreshToken,
    });
  } catch {
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }
});

router.post("/logout", requireAuth, async (c) => {
  const { refreshToken } = await c.req.json() as { refreshToken?: string };
  if (refreshToken) refreshTokenStore.delete(refreshToken);
  return c.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (c) => {
  const currentUser = c.get("user") as AccessTokenPayload;
  const user = await User.findByPk(currentUser.sub);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json(user.toJSON());
});

export { router as authRouter };
