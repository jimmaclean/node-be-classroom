# Module 3 — Middleware

---

## Setup

```bash
cd module-03
npm install
npm run dev
```

---

## Part 1: Sprint — What Middleware Is

Middleware is just a function that runs between the request arriving and the response being sent.

```typescript
function myMiddleware(req, res, next) {
  // do something with req or res
  next(); // pass control to the next function in the chain
}

app.use(myMiddleware);
```

The chain looks like this:

```
Request
  │
  ▼
express.json()     ← parses body
  │
  ▼
cors()             ← adds CORS headers
  │
  ▼
requestLogger()    ← logs the request
  │
  ▼
GET /echo/:name    ← your route handler
  │
  ▼
Response
```

Every `app.use()` call adds a function to this pipeline. **Order is everything.**

---

## Part 2: Deep Dive

### The Middleware Signature

```typescript
(req: Request, res: Response, next: NextFunction) => void
```

Three rules:
1. You must either **call `next()`** or **send a response** — never both, never neither
2. Calling `next()` passes to the next middleware
3. Calling `next(error)` skips all regular middleware and jumps to the error handler

### `app.use()` vs `app.get()` / `app.post()`

```typescript
app.use(fn)            // runs for ALL methods and ALL paths
app.use("/api", fn)    // runs for ALL methods on paths starting with /api
app.get("/users", fn)  // runs ONLY for GET /users
```

Use `app.use()` for middleware. Use `app.get/post/etc.` for route handlers.

### The Error Handler — 4 Parameters

Normal middleware: 3 params `(req, res, next)`
Error handler: 4 params `(err, req, res, next)`

Express identifies error handlers by their arity (number of parameters). You must declare all 4 even if you don't use `next`.

```typescript
// Regular middleware
app.use((req, res, next) => { next(); });

// Error handler — 4 params, registered LAST
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

Activate it from anywhere with `next(err)`, or by throwing synchronously.

### Async Routes in Express 4

Express 4 does **not** automatically catch rejected promises:

```typescript
// This will crash the process (unhandled rejection):
app.get("/bad", async (req, res) => {
  throw new Error("not caught!");
});

// Correct — wrap in try/catch and use next(err):
app.get("/good", async (req, res, next) => {
  try {
    throw new Error("caught correctly");
  } catch (err) {
    next(err);
  }
});
```

> **Note:** Express 5 (currently in release candidate) handles this automatically. Express 4 is still the most common version you'll encounter.

### Extending `req` with TypeScript

When you attach custom properties to `req` in middleware, TypeScript won't know about them by default. Use declaration merging:

```typescript
declare global {
  namespace Express {
    interface Request {
      startTime: number;  // now req.startTime is typed everywhere
    }
  }
}
```

See `src/middleware/timer.ts` for the full example.

### CORS — Why It Exists

Same-Origin Policy is a browser security rule: JavaScript on `http://localhost:3000` cannot fetch from `http://localhost:4000` without permission.

CORS (Cross-Origin Resource Sharing) is the mechanism for servers to grant that permission via headers:

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST
```

`curl` is not a browser — it ignores CORS entirely. You only hit CORS errors in the browser.

```typescript
app.use(cors({
  origin: "http://localhost:5173",  // your React/Next.js dev server
}));
```

### Router — Organising Routes

```typescript
// src/routes/users.ts
const router = Router();
router.get("/", listUsers);
router.post("/", createUser);
router.get("/:id", getUser);
export { router as usersRouter };

// src/server.ts
app.use("/users", usersRouter);
// Result: GET /users, POST /users, GET /users/:id
```

Each Router is its own mini-app with its own middleware chain.

---

## Exercises

1. Add a middleware that rejects requests with no `User-Agent` header (returns 400)
2. Add a `requireSecret` middleware that checks for a header `X-Secret: mysecret` and returns 401 if missing. Apply it only to the POST `/echo` route using `router.post("/", requireSecret, handler)`
3. Change `cors()` to `origin: false` — then open your browser console and try `fetch("http://localhost:3000/echo/test")`. What error do you see?
4. Add a middleware that adds `X-Response-Time` header to every response (use `req.startTime`)
5. **Challenge:** Make the error handler return HTML instead of JSON when the request `Accept` header includes `text/html`

---

## Key Takeaways

| Concept | Key point |
|---------|-----------|
| Middleware | `(req, res, next)` — call next() or send a response |
| Order | Registered top-to-bottom, executed top-to-bottom |
| Error handler | 4 params, registered last, activated by `next(err)` |
| `app.use()` | Runs for all methods/paths (or a path prefix) |
| Router | Mini-app for grouping related routes |
| CORS | Browser-only restriction — curl doesn't care |
| Async | Wrap in try/catch and call `next(err)` in Express 4 |

**Up next:** Module 4 — REST API Design + Input Validation with Zod.
