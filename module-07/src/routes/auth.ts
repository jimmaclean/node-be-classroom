import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// Fake user store — Module 8 replaces this with real DB + bcrypt
const FAKE_USERS = [
  { id: 1, email: "james@example.com", password: "password123", name: "James" },
  { id: 2, email: "alice@example.com", password: "hunter2",     name: "Alice" },
];

// ─── POST /auth/login ────────────────────────────────────

router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(422).json({ error: "email and password are required" });
    return;
  }

  const user = FAKE_USERS.find((u) => u.email === email && u.password === password);

  if (!user) {
    // Always return the same error for wrong email OR wrong password
    // Never say "email not found" — that leaks user existence (enumeration attack)
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Store safe data in the session (never store passwords)
  req.session.userId = user.id;
  req.session.email = user.email;
  req.session.loginCount = (req.session.loginCount ?? 0) + 1;

  // Session is automatically saved and the session ID cookie is set
  // The browser will send this cookie on every subsequent request
  res.json({
    message: "Logged in",
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ─── POST /auth/logout ───────────────────────────────────

router.post("/logout", (req: Request, res: Response) => {
  // destroy() removes the session from the store AND clears the cookie
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Could not log out" });
      return;
    }
    res.clearCookie("connect.sid"); // clear the session cookie from the browser
    res.json({ message: "Logged out" });
  });
});

// ─── GET /auth/me ─────────────────────────────────────────
// Protected route — requires a valid session

router.get("/me", requireAuth, (req: Request, res: Response) => {
  // req.session.userId exists because requireAuth checked it
  const user = FAKE_USERS.find((u) => u.id === req.session.userId);

  res.json({
    user: { id: user!.id, name: user!.name, email: user!.email },
    session: {
      loginCount: req.session.loginCount,
      sessionId: req.sessionID, // the ID stored in the cookie
    },
  });
});

// ─── PUT /auth/me ─────────────────────────────────────────
// Demonstrates: session persists across requests

router.put("/me/increment", requireAuth, (req: Request, res: Response) => {
  req.session.loginCount = (req.session.loginCount ?? 0) + 1;
  res.json({ loginCount: req.session.loginCount });
});

export { router as authRouter };
