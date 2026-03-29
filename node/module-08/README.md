# Module 8 — Authentication (Passwords + JWT)

---

## Setup

```bash
cd module-08
cp .env.example .env
# Edit .env and set real secrets (or leave the defaults for dev)
npm install
npm run dev
```

---

## Part 1: Sprint — Register, Login, Use Token

```
1. POST /auth/register  → get accessToken + refreshToken
2. GET  /auth/me        Authorization: Bearer <accessToken>
3. POST /auth/refresh   → get new accessToken when old one expires
4. POST /auth/logout    → revoke refresh token
```

Work through `requests.http` top to bottom. Paste the access token into the `@accessToken` variable at the top of the file.

---

## Part 2: Deep Dive

### bcrypt — Why You Never Store Plaintext Passwords

If your database is breached and passwords are plaintext, every user's account everywhere is compromised (people reuse passwords).

bcrypt is a *slow* hashing algorithm by design:

```typescript
// Storing a password:
const hash = await bcrypt.hash("supersecret123", 12);
// → "$2b$12$salt.and.hash.combined.in.one.string"
// The "12" is the cost factor — 12 rounds of hashing

// Verifying:
const valid = await bcrypt.compare("supersecret123", hash);
// → true (timing-safe comparison)
```

The salt is embedded in the hash — no separate storage needed. Even if two users have the same password, their hashes are different (different random salts).

**Cost factor (salt rounds):**
- 10 = ~100ms — fine for low-risk apps
- 12 = ~300ms — recommended for most apps
- 14 = ~1s — high-security

Higher = slower brute force attacks. Keep it high enough that automated cracking takes years, not minutes.

### JWT Structure

A JWT is three base64-encoded JSON objects separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsImVtYWlsIjoiamFtZXNAZXhhbXBsZS5jb20iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzA2MjAzNjAwLCJleHAiOjE3MDYyMDQ1MDB9.SIGNATURE
^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^
HEADER                 PAYLOAD                                                                                                       SIGNATURE
```

Decode the payload (it's just base64 — NOT encrypted):
```json
{
  "sub": 1,
  "email": "james@example.com",
  "type": "access",
  "iat": 1706203600,  ← issued at (Unix timestamp)
  "exp": 1706204500   ← expires at (Unix timestamp)
}
```

The **signature** is `HMAC-SHA256(base64(header) + "." + base64(payload), secret)`. Any tampering with the payload invalidates the signature.

> **Critical:** JWTs are encoded, NOT encrypted. Anyone can read the payload. Never put sensitive data (passwords, credit cards) in a JWT.

### Access Token + Refresh Token Pattern

**Access token:** short-lived (15 minutes), used for API calls
**Refresh token:** long-lived (7 days), used only to get new access tokens

```
Client                    Server
  │─── POST /auth/login ──→│
  │←── accessToken (15m) ──│
  │←── refreshToken (7d) ──│
  │
  │─── GET /api (+ access) →│  ← normal requests
  │
  │ ... 15 minutes later ...
  │
  │─── POST /auth/refresh ──→│  (+ refreshToken)
  │←── new accessToken ──────│
  │←── new refreshToken ─────│  ← refresh token rotation
```

**Why rotation?** If a refresh token is stolen, rotating means it can only be used once. The attacker's copy is immediately invalidated when the legitimate user refreshes.

### Where to Store JWTs on the Client

| Location | XSS safe? | CSRF safe? | Notes |
|----------|-----------|-----------|-------|
| `localStorage` | No | Yes | XSS can steal the token |
| `sessionStorage` | No | Yes | Same as localStorage |
| `HttpOnly` cookie | Yes | No | CSRF protection needed (SameSite helps) |
| `HttpOnly` cookie + `SameSite=Strict` | Yes | Yes | Best option for web apps |

For a Next.js frontend calling your Express API:
- Store access token in memory (React state) — lost on refresh, but secure from XSS
- Store refresh token in an `HttpOnly` cookie — persists across page loads, safe from JS

### Sessions vs JWT — Expanded

The Module 7 table, but with more nuance:

**Use sessions when:**
- You need instant logout (just delete from store)
- You have a monolith with one server (or shared Redis)
- You're building a traditional web app where pages and API are same-origin

**Use JWT when:**
- You're building an API consumed by mobile/SPA clients
- You have multiple backend services that need to verify identity without a shared store
- You want stateless, horizontally-scalable servers

In practice: many modern apps use JWTs in HttpOnly cookies — you get the statelessness benefits while keeping the security properties of HttpOnly cookies.

### Timing Attacks

A timing attack exploits the fact that `"wrong-email" !== "hash"` returns faster than bcrypt's `compare()`. An attacker measuring response times can determine whether an email exists:

```typescript
// BAD: returns fast if user not found, slow if bcrypt runs
if (!user) return res.status(401).json({ error: "Invalid" });
const valid = await bcrypt.compare(password, user.passwordHash);

// GOOD: always runs bcrypt, same timing regardless of user existence
const DUMMY = "$2b$12$invalid.hash.for.timing.purposes";
const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY);
if (!user || !valid) return res.status(401).json({ error: "Invalid credentials" });
```

---

## Exercises

1. Add a `PATCH /auth/password` route for changing passwords. Require: `currentPassword`, `newPassword`. Verify the current password with bcrypt before updating
2. Add a `GET /auth/users` route (admin only) that lists all users. Create an `isAdmin` boolean in the user object and check it in a middleware
3. What happens if you manually edit the JWT payload (change `sub` to a different ID) and send it? Try it with `jwt.io`
4. Implement a token blocklist: on logout, add the access token's `jti` claim to a Set. In `requireJWT`, reject tokens in the blocklist. (You'll need to add a `jti` UUID to `signAccessToken`)
5. **Challenge:** Store refresh tokens in a `Map<userId, Set<refreshToken>>`. On login from a new device, the old refresh tokens remain valid. Add a `DELETE /auth/sessions/all` endpoint that invalidates all refresh tokens for the current user (logout everywhere)

---

## Key Takeaways

| Concept | Key point |
|---------|-----------|
| bcrypt | Slow by design — cost factor 12 recommended |
| Password storage | Hash + salt, never plaintext |
| JWT | Header.Payload.Signature — encoded, NOT encrypted |
| Access token | Short-lived (15m) for API calls |
| Refresh token | Long-lived (7d) to get new access tokens, rotate on use |
| Timing attacks | Always run bcrypt even for non-existent users |
| Storage | HttpOnly cookie > localStorage for web clients |

**Up next:** Module 9 — Security Essentials. Hardening the API with helmet, rate limiting, and more.
