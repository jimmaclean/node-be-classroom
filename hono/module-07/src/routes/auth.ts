import { Hono } from "hono";
import { requireAuth } from "../middleware/requireAuth";
import { saveSession, destroySession, getSession } from "../middleware/sessionMiddleware";

const router = new Hono();

// Fake user store — Module 8 replaces this with real DB + bcrypt
const FAKE_USERS = [
  { id: 1, email: "james@example.com", password: "password123", name: "James" },
  { id: 2, email: "alice@example.com", password: "hunter2",     name: "Alice" },
];

// ─── POST /auth/login ────────────────────────────────────

router.post("/login", async (c) => {
  const { email, password } = await c.req.json() as { email?: string; password?: string };

  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 422);
  }

  const user = FAKE_USERS.find((u) => u.email === email && u.password === password);

  if (!user) {
    // Always return the same error for wrong email OR wrong password
    // Never say "email not found" — that leaks user existence (enumeration attack)
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Build the session data and save it
  // NOTE: In express-session, you mutate req.session directly and it auto-saves.
  //       In Hono, we build the data object and call saveSession() explicitly.
  const session = getSession(c);
  const updatedSession = {
    ...session,
    userId: user.id,
    email: user.email,
    loginCount: (session.loginCount ?? 0) + 1,
  };

  // saveSession() sets the cookie and persists data to the in-memory store
  saveSession(c, updatedSession);

  return c.json({
    message: "Logged in",
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ─── POST /auth/logout ───────────────────────────────────

router.post("/logout", (c) => {
  // destroySession() removes the session from the store AND clears the cookie
  // NOTE: express-session.req.session.destroy() takes a callback; this is synchronous
  destroySession(c);
  return c.json({ message: "Logged out" });
});

// ─── GET /auth/me ─────────────────────────────────────────
// Protected route — requires a valid session

router.get("/me", requireAuth, (c) => {
  // getSession(c).userId exists because requireAuth checked it
  const session = getSession(c);
  const user = FAKE_USERS.find((u) => u.id === session.userId);

  return c.json({
    user: { id: user!.id, name: user!.name, email: user!.email },
    session: {
      loginCount: session.loginCount,
      // NOTE: In express-session, req.sessionID exposes the raw session ID.
      // Here we read it from context — same value that's in the cookie.
      sessionId: c.get("sessionId"),
    },
  });
});

// ─── PUT /auth/me/increment ───────────────────────────────
// Demonstrates: session persists across requests

router.put("/me/increment", requireAuth, (c) => {
  const session = getSession(c);
  const updated = { ...session, loginCount: (session.loginCount ?? 0) + 1 };
  saveSession(c, updated);
  return c.json({ loginCount: updated.loginCount });
});

export { router as authRouter };
