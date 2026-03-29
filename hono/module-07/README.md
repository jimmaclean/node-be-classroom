# Module 7 — Sessions & Cookies

---

## Setup

```bash
cd module-07
cp .env.example .env
npm install
npm run dev
```

---

## Part 1: Sprint — How Sessions Work

HTTP is stateless — every request arrives with no memory of past requests. Sessions solve this by giving each user a unique ID stored in a cookie:

```
1. POST /auth/login (email + password)
   Server: creates session, sends cookie:
   Set-Cookie: connect.sid=s%3Axyz...; HttpOnly; Path=/

2. GET /dashboard
   Browser: automatically sends cookie:
   Cookie: connect.sid=s%3Axyz...
   Server: looks up session by ID → finds userId = 1 → grants access
```

Make the requests in order in `requests.http` and watch the `Set-Cookie` header appear on login.

---

## Part 2: Deep Dive

### The Cookie

A cookie is just a response header that tells the browser to store a value and send it back on future requests:

```
Set-Cookie: connect.sid=s%3Axyz...; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400
            ^^^^^^^^^^ ^^^^^^^^^^  ^^^^^^  ^^^^^^^^  ^^^^^^^^^^^^  ^^^^^^^^^^^
            name       value       scope   security  CSRF defense  expiry (1 day)
```

Browser returns it automatically on every subsequent request to the same domain:
```
Cookie: connect.sid=s%3Axyz...
```

### Cookie Security Flags

| Flag | Effect | Why it matters |
|------|--------|----------------|
| `HttpOnly` | JS cannot read this cookie (`document.cookie`) | Blocks XSS session theft |
| `Secure` | Only sent over HTTPS | Prevents session hijacking on HTTP |
| `SameSite=Lax` | Sent with same-site navigations + safe cross-site | CSRF protection |
| `SameSite=Strict` | Only same-site requests | Strongest CSRF protection |
| `Max-Age=N` | Expires after N seconds | Limits session lifetime |

**In production:** always use `Secure: true`, `HttpOnly: true`, `SameSite: "lax"` at minimum.

### What's in the Session Store?

```
Browser side:
  Cookie: connect.sid = "s%3Axyz123"   ← just an ID

Server side (MemoryStore):
  {
    "xyz123": {
      userId: 1,
      email: "james@example.com",
      loginCount: 3,
      cookie: { expires: ..., httpOnly: true }
    }
  }
```

The browser never sees `userId` or `email` — only the opaque session ID. This is the key security property of server-side sessions.

### Session Store Options

The default `MemoryStore` loses all sessions when the server restarts. For production:

```typescript
import connectPgSimple from "connect-pg-simple";
const PgSession = connectPgSimple(session);

session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "user_sessions",
  }),
  // ...
})
```

The sessions table persists across restarts and scales across multiple server instances.

### Session vs JWT (Preview of Module 8)

| | Sessions | JWT |
|--|---------|-----|
| State | Server stores session data | Client stores all data in token |
| Logout | Easy — delete from store | Hard — can't invalidate a token |
| Scale | Needs shared session store | Stateless — works across servers |
| Security | Server controls state | Token contains all claims |
| Best for | Traditional web apps, admin panels | APIs, mobile clients, microservices |

### Session Fixation

A security risk: if an attacker knows your session ID *before* you log in, they can use it after you do.

The fix: **always regenerate the session ID on login**:

```typescript
req.session.regenerate((err) => {
  // now req.session has a new ID — old ID is invalid
  req.session.userId = user.id;
  res.json({ message: "Logged in" });
});
```

This module's code doesn't do this for simplicity, but you should in production.

### `saveUninitialized: false`

Without this, Express creates a session (and sets a cookie) for every visitor, even before they log in. This:
- Wastes session store space
- Sends cookies to users who haven't consented (GDPR issue)
- Can cause issues with CORS preflight requests

With `saveUninitialized: false`, a session is only created when you first write to it.

---

## Exercises

1. Add a `lastSeen` timestamp to the session and update it on every request using middleware
2. Implement a `GET /auth/sessions` endpoint that shows how many sessions exist (hint: look at `req.sessionStore`)
3. Change `maxAge` to 10 seconds, then observe what happens to `/auth/me` after waiting
4. What happens if you send requests to `/dashboard` from two different browser tabs (different cookies)?
5. **Challenge:** Implement "remember me" — if the POST `/auth/login` body includes `rememberMe: true`, set `maxAge` to 30 days; otherwise use a session cookie (no `maxAge`, expires when browser closes)

---

## Key Takeaways

| Concept | Key point |
|---------|-----------|
| Session | Server-side storage keyed by a random ID |
| Cookie | Browser storage for the session ID, sent automatically |
| `HttpOnly` | JS can't read it — blocks XSS theft |
| `Secure` | HTTPS only — blocks network interception |
| `SameSite` | Controls CSRF — use `lax` or `strict` |
| `saveUninitialized: false` | Don't create sessions until needed |
| `requireAuth` | Middleware that checks `req.session.userId` |

**Up next:** Module 8 — Real authentication with bcrypt passwords and JWT tokens.
