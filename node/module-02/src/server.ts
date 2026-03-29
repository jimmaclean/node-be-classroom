import express, { Request, Response } from "express";

const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
// Without this, req.body is always undefined for JSON requests.
// It reads the raw bytes from the request stream and parses them as JSON.
app.use(express.json());

// ─────────────────────────────────────────────────────────
// SPRINT: The minimal Express server — understand this first
// ─────────────────────────────────────────────────────────

// app.get(path, handler) — register a route for GET requests
// req = the incoming request, res = our outgoing response
app.get("/hello", (req: Request, res: Response) => {
  res.json({ message: "Hello from Express!" });
});

// ─────────────────────────────────────────────────────────
// DEEP DIVE: The /echo endpoint — expose every part of req
// ─────────────────────────────────────────────────────────

// Route params: /echo/james → req.params.name = "james"
// The :name syntax creates a named capture in the URL pattern
app.get("/echo/:name", (req: Request, res: Response) => {
  res.json({
    // req.params — dynamic segments of the URL path
    params: req.params,

    // req.query — everything after the ? in the URL
    // e.g. /echo/james?color=blue&size=large
    query: req.query,

    // req.headers — all request headers as lowercase keys
    // Browsers and curl send many headers automatically
    headers: req.headers,

    // req.method — the HTTP method used ("GET", "POST", etc.)
    method: req.method,

    // req.path — the path portion of the URL (no query string)
    path: req.path,

    // req.url — full URL including query string
    url: req.url,

    // req.ip — the client's IP address
    ip: req.ip,
  });
});

// POST to /echo — this one accepts a body too
app.post("/echo", (req: Request, res: Response) => {
  res.json({
    params: req.params,
    query: req.query,
    // req.body — the parsed request body (available because of express.json() above)
    // Without that middleware, this would be undefined
    body: req.body,
    headers: req.headers,
    method: req.method,
  });
});

// ─────────────────────────────────────────────────────────
// DEEP DIVE: Controlling the response
// ─────────────────────────────────────────────────────────

// res.status() sets the status code — always chain before sending
app.get("/status-demo", (req: Request, res: Response) => {
  const code = Number(req.query.code) || 200;

  // res.status(n) — set the status code
  // .json() — serialize to JSON and set Content-Type: application/json
  res.status(code).json({
    youAskedFor: code,
    message: `This response has status ${code}`,
  });
});

// Different response types — not everything is JSON
app.get("/html-demo", (req: Request, res: Response) => {
  // res.send() with a string infers Content-Type: text/html
  res.send("<h1>Hello from Express</h1><p>This is HTML, not JSON.</p>");
});

app.get("/text-demo", (req: Request, res: Response) => {
  // Explicitly set the Content-Type header, then send plain text
  res.set("Content-Type", "text/plain");
  res.send("Just plain text. No JSON, no HTML.");
});

// Setting custom response headers
app.get("/headers-demo", (req: Request, res: Response) => {
  // res.set(name, value) — add any header to the response
  res.set("X-Custom-Header", "hello-from-express");
  res.set("X-Request-Id", Math.random().toString(36).slice(2));
  res.json({ message: "Check the response headers in DevTools or curl -v" });
});

// ─────────────────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────────────────

// app.listen(port, callback) — binds to a TCP port and starts
// accepting connections. Node.js event loop keeps it alive.
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Try: curl http://localhost:${PORT}/hello`);
});
