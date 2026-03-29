import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { User } from "../models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
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

router.post("/register", async (req: Request, res: Response) => {
  const result = RegisterSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ errors: result.error.issues });
    return;
  }

  const { name, email, password } = result.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    const accessToken = signAccessToken(user.id, user.email);
    const refreshToken = signRefreshToken(user.id);
    refreshTokenStore.add(refreshToken);

    res.status(201).json({
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "SequelizeUniqueConstraintError") {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ errors: result.error.issues });
    return;
  }

  const { email, password } = result.data;
  const user = await User.findOne({ where: { email } });

  const DUMMY = "$2b$12$invalidhashfortimingnull.invalidhash";
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);

  if (!user || !valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);
  refreshTokenStore.add(refreshToken);

  res.json({ user: user.toJSON(), accessToken, refreshToken });
});

router.post("/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken || !refreshTokenStore.has(refreshToken)) {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    refreshTokenStore.delete(refreshToken);

    const newRefreshToken = signRefreshToken(payload.sub);
    refreshTokenStore.add(newRefreshToken);

    // We need the email for the access token — fetch the user
    User.findByPk(payload.sub).then((user) => {
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      res.json({
        accessToken: signAccessToken(user.id, user.email),
        refreshToken: newRefreshToken,
      });
    });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.post("/logout", requireAuth, (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) refreshTokenStore.delete(refreshToken);
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user.toJSON());
});

export { router as authRouter };
