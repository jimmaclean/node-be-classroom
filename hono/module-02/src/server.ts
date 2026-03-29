import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();
const PORT = 3000;

// ─────────────────────────────────────────────────────────
// SPRINT: The minimal Hono server — understand this first
// ─────────────────────────────────────────────────────────

// app.get(path, handler) — register a route for GET requests
// c = the Context object, which wraps both request and response in one place
app.get("/hello", (c) => {
  return c.json({ message: "Hello from Hono!" });
});

// ─────────────────────────────────────────────────────────
// DEEP DIVE: The /echo endpoint — expose every part of req
// ─────────────────────────────────────────────────────────

// Route params: /echo/james → c.req.param("name") = "james"
app.get("/echo/:name", (c) => {
  return c.json({
    // c.req.param() — dynamic segments of the URL path
    params: { name: c.req.param("name") },

    // c.req.query() — everything after the ? in the URL (returns object)
    // e.g. /echo/james?color=blue&size=large
    query: c.req.query(),

    // c.req.header() — request headers (case-insensitive)
    // Browsers and curl send many headers automatically
    headers: Object.fromEntries(c.req.raw.headers),

    // c.req.method — the HTTP method used ("GET", "POST", etc.)
    method: c.req.method,

    // c.req.path — the path portion of the URL (no query string)
    path: c.req.path,

    // c.req.url — full URL including query string
    url: c.req.url,

    // NOTE: Hono does not expose req.ip directly.
    // With @hono/node-server, use getConnInfo() from "@hono/node-server/conninfo"
    // or read the x-forwarded-for header: c.req.header("x-forwarded-for")
    ip: c.req.header("x-forwarded-for") ?? "(use getConnInfo from @hono/node-server)",
  });
});

// POST to /echo — this one accepts a body too
app.post("/echo", async (c) => {
  return c.json({
    params: {},
    query: c.req.query(),
    // c.req.json() — parse the request body as JSON (always async in Hono)
    // NOTE: Unlike Express, there is no express.json() middleware needed.
    //       Hono parses bodies lazily on demand via c.req.json() / c.req.text() / etc.
    body: await c.req.json(),
    headers: Object.fromEntries(c.req.raw.headers),
    method: c.req.method,
  });
});

// ─────────────────────────────────────────────────────────
// DEEP DIVE: Controlling the response
// ─────────────────────────────────────────────────────────

// c.json(body, status) — serialize to JSON and set Content-Type: application/json
app.get("/status-demo", (c) => {
  const code = Number(c.req.query("code")) || 200;

  // c.json(body, status) — the status is the second argument (not chained)
  return c.json({
    youAskedFor: code,
    message: `This response has status ${code}`,
  }, code as ContentfulStatusCode);
});

// Different response types — not everything is JSON
app.get("/html-demo", (c) => {
  // c.html() — sends HTML with Content-Type: text/html
  return c.html("<h1>Hello from Hono</h1><p>This is HTML, not JSON.</p>");
});

app.get("/text-demo", (c) => {
  // c.text() — sends plain text with Content-Type: text/plain
  // NOTE: No need to set Content-Type manually, c.text() handles it
  return c.text("Just plain text. No JSON, no HTML.");
});

// Setting custom response headers
app.get("/headers-demo", (c) => {
  // c.header(name, value) — add any header to the response
  c.header("X-Custom-Header", "hello-from-hono");
  c.header("X-Request-Id", Math.random().toString(36).slice(2));
  return c.json({ message: "Check the response headers in DevTools or curl -v" });
});

// ─────────────────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────────────────

// serve() from @hono/node-server — adapts Hono's Web-standard fetch interface
// to Node.js's http module. Hono's core is runtime-agnostic (Bun, Deno, Workers)
// and @hono/node-server is the Node.js-specific adapter.
serve({ fetch: app.fetch, port: PORT });
console.log(`Server running at http://localhost:${PORT}`);
console.log(`Try: curl http://localhost:${PORT}/hello`);

// NOTE: TypeScript helper type for valid status codes with a body
type ContentfulStatusCode = 200 | 201 | 202 | 203 | 204 | 206 | 207 | 208 | 226
  | 300 | 301 | 302 | 303 | 304 | 307 | 308
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410
  | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423
  | 424 | 425 | 426 | 428 | 429 | 431 | 451
  | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;
