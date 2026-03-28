# Module 9 — Security Essentials

---

## Setup

```bash
cd module-09
npm install
npm run dev
```

---

## Part 1: Sprint — Add Security in 3 Lines

These three lines close the most common security gaps in an Express API:

```typescript
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

app.use(helmet());                // 15 security headers
app.use(cors({ origin: "..." })); // restrict origins
app.use(rateLimit({ max: 100, windowMs: 15 * 60 * 1000 })); // rate limiting
```

Compare headers before and after helmet:
```bash
# Without helmet — Express default
curl -I http://localhost:3000/headers-check

# With helmet — many new headers
curl -I http://localhost:3000/headers-check
```

---

## Part 2: Deep Dive

### helmet — Security Headers

helmet sets headers that instruct browsers to behave more securely. You can't control what browsers do, but you can tell them what you want.

**Key headers helmet sets:**

```
X-Content-Type-Options: nosniff
```
Prevents browsers from "sniffing" the content type. Without this, a browser might execute an uploaded `.txt` file as JavaScript if it looks like JS.

```
X-Frame-Options: DENY
```
Prevents your app from being embedded in an `<iframe>`. Blocks clickjacking — where an attacker overlays your UI invisibly inside their page to trick users into clicking things.

```
Content-Security-Policy: default-src 'self'
```
Tells the browser: only load resources (scripts, images, fonts) from your own origin. Prevents XSS by blocking injected scripts from phoning home to attacker servers.

```
Referrer-Policy: no-referrer
```
Prevents your URL being sent to third parties in the `Referer` header when a user clicks a link.

```
Strict-Transport-Security: max-age=31536000
```
Tells browsers: always use HTTPS for this domain for the next year. Even if a user types `http://`, the browser upgrades to `https://` automatically.

### CORS — Cross-Origin Resource Sharing

Browsers enforce the **Same-Origin Policy**: a script from `app.com` cannot fetch from `api.com` without permission.

CORS is how your API grants permission:
```
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Methods: GET, POST
```

The browser sends an `OPTIONS` preflight request before the actual request to check these headers. If they're missing or wrong, the browser blocks the request.

**Common mistakes:**

```typescript
// BAD: allows any origin — defeats same-origin protection
app.use(cors({ origin: "*" }));

// BAD: origin: "*" with credentials: true — impossible (browsers block it)
app.use(cors({ origin: "*", credentials: true }));

// GOOD: explicit allow list
app.use(cors({
  origin: ["https://myapp.com", "http://localhost:5173"],
  credentials: true,
}));
```

### Rate Limiting — Brute Force Protection

Without rate limiting, an attacker can try millions of password combinations against `/auth/login`:

```typescript
// Stricter limit on auth routes
app.use("/auth/login", rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts max
}));
```

Response headers tell the client what's happening:
```
RateLimit-Limit: 10
RateLimit-Remaining: 7
RateLimit-Reset: 2024-01-15T10:15:00.000Z
```

### Mass Assignment

If you spread `req.body` directly into a DB call, attackers can inject fields:

```typescript
// BAD — user sends: { "name": "James", "isAdmin": true }
await User.create(req.body); // isAdmin: true gets saved!

// GOOD — Zod schema only allows specific fields through
const { name, email } = UserSchema.parse(req.body);
await User.create({ name, email }); // isAdmin never touched
```

This is why you always validate input — even if the DB schema would reject it, be explicit.

### SQL Injection — Why ORMs Protect You

SQL injection attacks inject malicious SQL through user input:
```sql
-- Attacker sends: email = "' OR 1=1 --"
SELECT * FROM users WHERE email = '' OR 1=1 --'
-- This returns ALL users!
```

Sequelize (and any ORM) uses **parameterized queries**:
```typescript
// Sequelize generates: SELECT * FROM users WHERE email = $1
// With $1 bound to the raw string "' OR 1=1 --" — treated as data, not SQL
await User.findOne({ where: { email: req.body.email } });
```

The raw string is never interpreted as SQL. You're protected as long as you use the ORM's query methods — never interpolate user input into raw SQL strings.

If you ever write raw SQL, use Sequelize's parameterized query method:
```typescript
// BAD
await sequelize.query(`SELECT * FROM users WHERE email = '${email}'`);

// GOOD — $email is bound safely
await sequelize.query("SELECT * FROM users WHERE email = :email", {
  replacements: { email },
});
```

### Body Size Limits

An attacker could send a 100MB JSON body to consume memory and crash your server:

```typescript
app.use(express.json({
  limit: "100kb", // reject bodies larger than this
}));
```

### Secrets Management

```bash
# Never commit secrets
echo ".env" >> .gitignore

# Generate a cryptographically random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

In production: use a secrets manager (AWS Secrets Manager, Doppler, Vault) — not just `.env` files.

### OWASP Top 10 Quick Reference

| Risk | How to mitigate |
|------|----------------|
| Injection (SQL, etc.) | Parameterized queries (ORMs) |
| Broken auth | bcrypt, JWT, rate limiting on auth |
| Sensitive data exposure | HTTPS (HSTS), no secrets in code |
| XSS | CSP header (helmet), validate/escape output |
| IDOR | Check authorization, not just authentication |
| Security misconfiguration | helmet, remove default headers, disable X-Powered-By |
| Mass assignment | Always whitelist with Zod/validation |

---

## Lab Exercises

### Lab 9.1 — Before/After Helmet

```bash
# 1. Comment out helmetMiddleware in server.ts, restart server
curl -I http://localhost:3000/headers-check
# Note which headers are missing

# 2. Uncomment helmetMiddleware, restart
curl -I http://localhost:3000/headers-check
# Count how many new headers appeared
```

### Lab 9.2 — Trigger the Rate Limiter

```bash
# Hit the rate-limited endpoint 15 times fast
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/rate-limit-check
done
# You'll see 200 then 429 (Too Many Requests)
```

### Lab 9.3 — Mass Assignment

Add `"isAdmin": true` to the POST `/users` request body. Confirm it doesn't appear in the response (Zod strips it).

---

## Exercises

1. Add a `X-Request-Id` header to every response using middleware (generate with `crypto.randomUUID()`) — useful for request tracing
2. Implement IP-based blocking: maintain a `Set<string>` of blocked IPs. Add middleware that checks `req.ip` against the set before processing any request
3. Add `express-slow-down` to rate-limit by slowing responses instead of blocking — useful for APIs you don't want to break
4. **Challenge:** Read the CSP header that helmet sets. Open the `/headers-check` route in a browser (not curl). Then open the browser console and try `fetch("https://evil.com")` — the CSP should block it. What does the error say?

---

## Key Takeaways

| Tool | What it prevents |
|------|----------------|
| `helmet()` | XSS, clickjacking, sniffing, HSTS violations |
| `cors({ origin })` | Unauthorized cross-origin requests |
| `express-rate-limit` | Brute force, DDoS, abuse |
| Body size limit | Memory exhaustion attacks |
| Mass assignment protection | Injecting unauthorized fields via req.body |
| Parameterized queries | SQL injection |
| `.env` + `.gitignore` | Secret leakage |

**Up next:** Module 10 — Capstone: the "Reads" bookmarks API, combining everything.
