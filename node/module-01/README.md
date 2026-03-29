# Module 1 — How HTTP Actually Works

> **No code in this module.** You're going to use `curl` and your browser's DevTools to observe real HTTP traffic before writing a single line of Express. Understanding the protocol first means you'll never have to guess what Express is doing for you.

---

## Part 1: Sprint — The Core Idea in 5 Minutes

Every interaction between a browser and a server is just two text messages:

1. The **request** — browser asks for something
2. The **response** — server replies

That's it. HTTP is a text protocol. Here's a real one:

**Request:**
```
GET /index.html HTTP/1.1
Host: example.com
Accept: text/html
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 1256

<!doctype html>...
```

### Try it right now

```bash
curl -v http://example.com 2>&1 | head -60
```

Look for lines starting with `>` (your request) and `<` (the server's response). That's the whole protocol.

---

## Part 2: Deep Dive

### 2.1 — What Happens When You Hit a URL

Before HTTP even starts, your computer has to find the server:

```
1. You type: https://github.com
2. DNS lookup: "what IP is github.com?" → 140.82.121.4
3. TCP handshake: your machine connects to that IP on port 443
4. TLS handshake: encryption negotiated (for https)
5. HTTP request sent over that connection
6. Server responds
7. Connection may stay open (keep-alive) for more requests
```

HTTP only starts at step 5. Steps 1–4 are invisible to Express — the OS and Node.js handle them.

### 2.2 — Anatomy of an HTTP Request

```
METHOD /path?query=string HTTP/1.1   ← Request line
Host: example.com                    ← Headers (key: value)
Content-Type: application/json       ← Headers continue...
Authorization: Bearer abc123         ← ...one per line
                                     ← Blank line = end of headers
{"key": "value"}                     ← Body (optional)
```

**Every part matters:**

| Part | Purpose | Express exposes it as |
|------|---------|----------------------|
| Method | Intent (read vs write) | `req.method` |
| Path | Which resource | `req.path` |
| Query string | Filters/options | `req.query` |
| Headers | Metadata about the request | `req.headers` |
| Body | Data being sent | `req.body` (with middleware) |

### 2.3 — HTTP Methods and Their Semantics

Methods aren't arbitrary. They carry meaning that browsers, proxies, and CDNs all act on:

| Method | Meaning | Has Body? | Safe? | Idempotent? |
|--------|---------|-----------|-------|-------------|
| `GET` | Fetch a resource | No | Yes | Yes |
| `POST` | Create / submit | Yes | No | No |
| `PUT` | Replace entirely | Yes | No | Yes |
| `PATCH` | Partial update | Yes | No | No |
| `DELETE` | Remove | No | No | Yes |
| `HEAD` | Like GET but no body | No | Yes | Yes |
| `OPTIONS` | What methods are allowed? | No | Yes | Yes |

**Safe** = doesn't change server state (browsers can retry freely)
**Idempotent** = calling it N times = same as calling it once (safe to retry on network failure)

> **Why this matters for you as a frontend dev:** When Next.js uses `fetch()` to call an API, it assumes `GET` requests can be cached. A POST is never cached. These are HTTP semantics, not Next.js opinions.

### 2.4 — Anatomy of an HTTP Response

```
HTTP/1.1 200 OK                      ← Status line
Content-Type: application/json       ← Headers
Cache-Control: max-age=3600          ← Headers
                                     ← Blank line
{"users": [...]}                     ← Body
```

**Status codes — the ones you'll actually use:**

| Code | Name | When to use |
|------|------|-------------|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST that created something |
| `204` | No Content | Successful DELETE (no body) |
| `301` | Moved Permanently | Resource has a new permanent URL |
| `304` | Not Modified | Cached version is still valid |
| `400` | Bad Request | Client sent invalid data |
| `401` | Unauthorized | Not logged in (no credentials) |
| `403` | Forbidden | Logged in but not allowed |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate resource, version mismatch |
| `422` | Unprocessable Entity | Validation failed |
| `429` | Too Many Requests | Rate limited |
| `500` | Internal Server Error | Your server crashed |
| `503` | Service Unavailable | Server is down/overloaded |

> **401 vs 403:** 401 = "who are you?", 403 = "I know who you are, but no."

### 2.5 — Headers You'll See Constantly

**Request headers:**
```
Accept: application/json          # What format the client wants back
Content-Type: application/json    # Format of the request body
Authorization: Bearer <token>     # Auth credential
Cookie: session=abc123            # Session cookie
Origin: https://myapp.com         # Where the request came from (CORS)
```

**Response headers:**
```
Content-Type: application/json    # Format of the response body
Set-Cookie: session=abc123        # Tell browser to store a cookie
Cache-Control: max-age=3600       # Caching instructions (Module 5)
Access-Control-Allow-Origin: *    # CORS permission (Module 9)
Location: /users/42               # Used with 201/301/302 redirects
```

### 2.6 — HTTP/1.1 vs HTTP/2 vs HTTP/3 (Brief)

| Version | Key change | Impact on you |
|---------|-----------|---------------|
| HTTP/1.1 | Keep-alive connections | One request at a time per connection |
| HTTP/2 | Multiplexing | Many requests over one connection — this is why bundling matters less now |
| HTTP/3 | QUIC (UDP-based) | Faster on bad networks |

Express operates at the HTTP layer — it works the same regardless of which version the client uses. Node.js handles the version negotiation.

---

## Lab Exercises

Work through these in your terminal. Observe, don't memorize.

### Lab 1.1 — Inspect a real request/response
```bash
# -v = verbose (shows headers), -s = silent (no progress bar)
curl -v -s https://httpbin.org/get 2>&1
```
Find: the request headers, the response status code, the Content-Type header, the response body.

### Lab 1.2 — Try different methods
```bash
# GET
curl -v https://httpbin.org/get 2>&1 | grep -E "^[><]"

# POST with a JSON body
curl -v -X POST https://httpbin.org/post \
  -H "Content-Type: application/json" \
  -d '{"name": "James"}' 2>&1 | grep -E "^[><]"

# DELETE
curl -v -X DELETE https://httpbin.org/delete 2>&1 | grep -E "^[><]"
```

Note that httpbin.org echoes back what you sent — useful for learning.

### Lab 1.3 — See only the response headers
```bash
# -I = HEAD request (headers only, no body)
curl -I https://github.com
```
Find: the status code, Content-Type, any cache-related headers.

### Lab 1.4 — DevTools Network tab
1. Open any website in Chrome/Firefox
2. Open DevTools → Network tab
3. Reload the page
4. Click on the first request (usually the HTML document)
5. Explore: Headers tab, Preview tab, Timing tab
6. Find a request with a JSON response — look at its headers

### Lab 1.5 — Follow a redirect
```bash
# Without -L: you see the 301/302 redirect
curl -v http://github.com 2>&1 | head -30

# With -L: curl follows the redirect automatically
curl -v -L http://github.com 2>&1 | head -60
```
Notice the `Location:` header in the first response — that's where the redirect points.

---

## Notes Template

Fill this in as you work through the labs:

```
What status code does github.com return for http:// (not https)? ___

What is the Content-Type of a JSON API response? ___

What header tells the browser where to store state? ___

What's the difference between what you see in DevTools vs what curl shows? ___

One thing that surprised you: ___
```

---

## Summary

| Concept | Key takeaway |
|---------|-------------|
| HTTP | Text protocol: request + response |
| Methods | Carry semantic meaning (safe, idempotent) |
| Status codes | 2xx=success, 3xx=redirect, 4xx=client error, 5xx=server error |
| Headers | Metadata — the most important knob you have |
| Body | Optional payload, format declared by Content-Type |

**Up next:** Module 2 — we'll spin up a Node.js/Express server and handle these requests in TypeScript.
