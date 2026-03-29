# Module 2 — Express Server Fundamentals

---

## Setup

```bash
cd module-02
npm install
npm run dev
```

The server starts at `http://localhost:3000` and auto-restarts when you save changes (`ts-node-dev` watches your files).

---

## Part 1: Sprint — The Minimum Viable Express Server

Open `src/server.ts`. The core pattern is:

```typescript
import express from "express";

const app = express();

app.get("/hello", (req, res) => {
  res.json({ message: "Hello!" });
});

app.listen(3000, () => console.log("Running on port 3000"));
});
```

Three things happening:
1. **`express()`** — creates an application object (not a server yet)
2. **`app.get(path, handler)`** — registers a route
3. **`app.listen(port)`** — creates an HTTP server and starts accepting connections

Test it:
```bash
curl http://localhost:3000/hello
```

That's Express. Everything else is building on this foundation.

---

## Part 2: Deep Dive

### What is `app`?

`express()` returns an object that is both a request handler function and an event emitter with methods for registering routes. When you call `app.listen(3000)`, Express creates a Node.js `http.Server` under the hood and passes `app` as the request handler. You could also do:

```typescript
import http from "http";
const server = http.createServer(app);
server.listen(3000);
```

That's exactly what `app.listen()` does internally.

### The Request Object (`req`)

`req` is a wrapper around Node's `IncomingMessage` with Express extras added:

```typescript
req.method          // "GET", "POST", etc.
req.path            // "/echo/james"
req.url             // "/echo/james?color=blue"
req.params          // { name: "james" }         — from :name in route
req.query           // { color: "blue" }          — from ?color=blue
req.headers         // { "content-type": "..." }  — all lowercase
req.body            // { key: "value" }           — requires express.json() middleware
req.ip              // "::1" (localhost IPv6)
```

> **Bridge to what you know:** In Next.js App Router, `request.nextUrl.searchParams` is the same concept as `req.query`. In Pages Router, `context.query` maps to `req.query`.

### The Response Object (`res`)

`res` wraps Node's `ServerResponse`. Key methods:

```typescript
res.json(data)               // Sets Content-Type: application/json, serializes data
res.send(string)             // Sends a string, infers Content-Type
res.status(404).json(...)    // Chain: set status then send body
res.set("Header", "value")   // Set a single response header
res.redirect("/new-url")     // Send 302 with Location header
```

`res.json()` vs `res.send()`:
- `res.json()` always sets `Content-Type: application/json` and calls `JSON.stringify()`
- `res.send()` with an object does the same thing — but be explicit with `.json()` in APIs

### Route Parameters vs Query Strings

```
GET /users/42/posts?page=2&limit=10
         ^^                ^^^^^^^
    req.params.id      req.query.page, req.query.limit
```

**Route params** (`:id`) = part of the resource identity. The URL changes per resource.
**Query strings** (`?page=2`) = modifiers, filters, options. Same resource, different view.

Convention: `/users/42` identifies user 42. `/users?role=admin` filters users.

### Why `express.json()` is Required

HTTP bodies are raw byte streams. Express doesn't know if it's JSON, a form, an image, or garbage. `express.json()` is a middleware that:
1. Reads the raw body stream
2. Checks if `Content-Type: application/json`
3. If yes, parses it and attaches the result to `req.body`
4. Calls `next()` to pass control to your route handler

Without it, `req.body` is `undefined`. (Module 3 covers middleware in depth.)

### TypeScript Types

Express ships with `@types/express` which gives you:

```typescript
import { Request, Response, NextFunction } from "express";

app.get("/path", (req: Request, res: Response) => {
  // req and res are now fully typed
});
```

You can extend these types for your own properties (covered in Module 3 with custom middleware).

---

## Exercises

1. Add a `GET /about` route that returns your name and today's date in JSON
2. Add a `GET /greet/:firstName/:lastName` route that returns a greeting using both params
3. Try sending a POST to `/echo` *without* the `Content-Type: application/json` header. What happens to `req.body`? Why?
4. Set a response header `X-Powered-By` to something custom (hint: Express sets one by default — check what it is with `curl -v`)
5. **Challenge:** Make `/echo/:name` return a `404` status with `{ error: "Name too short" }` if the name param is less than 2 characters

---

## Key Takeaways

| Concept | How Express exposes it |
|---------|----------------------|
| URL path segments | `req.params` |
| Query string | `req.query` |
| Request body | `req.body` (needs middleware) |
| Request headers | `req.headers` |
| Send JSON | `res.json(data)` |
| Set status code | `res.status(n)` |
| Set response header | `res.set(name, value)` |

**Up next:** Module 3 — Middleware. This is the most important concept in Express.
