# Module 5 — Caching Headers

---

## Setup

```bash
cd module-05
npm install
npm run dev
```

---

## Part 1: Sprint — Cache-Control in One Minute

`Cache-Control` is a response header that tells caches (browser, CDN, proxy) what they're allowed to do with your response.

```
Cache-Control: public, max-age=3600
               ^^^^^^  ^^^^^^^^^^^^
               who     how long (seconds)
```

Three common values you'll use daily:

```typescript
// Anyone can cache this for 60 seconds
res.set("Cache-Control", "public, max-age=60");

// Only the browser caches this (not CDNs) — user-specific data
res.set("Cache-Control", "private, max-age=60");

// Never cache this — auth tokens, sensitive data
res.set("Cache-Control", "no-store");
```

Hit `/public-data`, `/private-data`, and `/sensitive-data` and look at the `Cache-Control` header in each response.

---

## Part 2: Deep Dive

### The Cache Hierarchy

When a browser makes a request, it checks caches in order:

```
Browser cache → CDN/proxy → Origin server (your Express app)
```

`Cache-Control` controls each layer:
- `public` — browser AND CDN/proxy can cache
- `private` — ONLY the browser cache (CDN never stores it)
- `no-store` — nothing stores it (always hits origin)
- `no-cache` — can be stored, but must revalidate with origin before use

> **Gotcha:** `no-cache` does NOT mean "don't cache" — it means "cache it, but check freshness first." For "don't cache," use `no-store`.

### `max-age` vs `s-maxage`

```
Cache-Control: public, max-age=60, s-maxage=3600
                       ^^^^^^^^^^  ^^^^^^^^^^^^^
                       browser     CDN (overrides max-age for shared caches)
```

Use `s-maxage` when you want CDNs to cache longer than the browser.

### The `Vary` Header

Tells caches: "the response varies based on these request headers."

```typescript
res.set("Vary", "Accept-Language");
// A French user and an English user get different cached responses
```

Without `Vary`, a CDN might return a French response to an English user.

### ETag — Conditional Requests

ETags solve a different problem: *you're not sure if content has changed, but you don't want to re-download it if it hasn't.*

The flow:
```
1. Client: GET /posts
   Server: 200 OK + ETag: "abc123" + body (1KB)

2. Client: GET /posts + If-None-Match: "abc123"
   Server checks: is the ETag still "abc123"?
   - YES → 304 Not Modified (no body, saves bandwidth)
   - NO  → 200 OK + new ETag + new body
```

Express has built-in ETag support (`app.set("etag", true)`) but it only generates ETags for string/buffer responses sent with `res.send()`. Our custom middleware in `src/middleware/cache.ts` works with `res.json()`.

### Last-Modified — Time-Based Validation

Same idea as ETag but uses timestamps instead of hashes:

```
1. Server sends: Last-Modified: Mon, 15 Jan 2024 10:00:00 GMT
2. Client sends: If-Modified-Since: Mon, 15 Jan 2024 10:00:00 GMT
3. Server compares timestamps → 304 or 200
```

ETags are generally preferred because timestamps have 1-second precision and can cause issues with fast-changing resources.

### `stale-while-revalidate`

An advanced directive that enables "background refresh":

```
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

Behaviour:
- 0–60s: serve from cache instantly
- 60–360s: serve stale cache instantly, but fetch fresh version in background
- >360s: stale cache expired, must wait for fresh response

This is the pattern behind Next.js's Incremental Static Regeneration (ISR) — now you know where it comes from.

### When NOT to Cache

Rule of thumb: **if the response would be different for different users, use `private` or `no-store`.**

```typescript
// Never cache:
res.set("Cache-Control", "no-store"); // auth tokens, session data, admin pages

// Private cache (browser only):
res.set("Cache-Control", "private, max-age=60"); // user profile, personalised data

// Public cache (browser + CDN):
res.set("Cache-Control", "public, max-age=3600"); // product pages, blog posts, assets
```

### Bridge to Next.js

Next.js's `fetch()` caching (App Router) maps directly to these headers:

```typescript
// Next.js                          // What it sets on your Express response
fetch(url)                          // Cache-Control: max-age=31536000
fetch(url, { cache: "no-store" })   // Cache-Control: no-store
fetch(url, { next: { revalidate: 60 } }) // stale-while-revalidate
```

When you use `unstable_cache` or ISR, Next.js is managing these headers for you. Now you understand what it's doing.

---

## Lab Exercises

### Lab 5.1 — Observe Browser Caching

1. Start the server and open `http://localhost:3000/public-data` in Chrome
2. Open DevTools → Network tab
3. Reload the page — look at the status code and `Size` column for `/public-data`
4. Notice it says `(disk cache)` or similar after the first load
5. Now try `/sensitive-data` — it should always be `200`, never cached

### Lab 5.2 — ETag Round-Trip

```bash
# Step 1: get the ETag
curl -v http://localhost:3000/posts 2>&1 | grep -i etag
# Output: < ETag: "abc123..."

# Step 2: use it — should get 304
curl -v http://localhost:3000/posts -H 'If-None-Match: "abc123..."'
# Output: < HTTP/1.1 304 Not Modified
```

### Lab 5.3 — Observe Real Sites

```bash
# GitHub API has great cache headers
curl -I https://api.github.com

# A CDN-served asset
curl -I https://cdn.jsdelivr.net/npm/react/index.js
```

---

## Exercises

1. Add `Cache-Control: public, max-age=300` to the `GET /posts` route in Module 4 (public posts only)
2. Add `no-store` to any route that would return authenticated user data
3. What's wrong with this: `Cache-Control: public, max-age=0`? (Hint: is it useful?)
4. **Challenge:** Modify the ETag middleware to use `sha256` instead of `md5`. Then use `crypto.createHash("sha256")`. Is the ETag value different?
5. **Challenge:** Implement `stale-while-revalidate` manually: add a route that serves a cached value immediately and triggers a background "refresh" (just update a variable) for the next request

---

## Key Takeaways

| Header | Purpose |
|--------|---------|
| `Cache-Control: public, max-age=N` | CDN + browser caches for N seconds |
| `Cache-Control: private, max-age=N` | Browser-only cache for N seconds |
| `Cache-Control: no-store` | Nothing cached, ever |
| `Cache-Control: no-cache` | Can cache, but must revalidate first |
| `ETag: "hash"` | Fingerprint — enables 304 Not Modified |
| `Last-Modified: date` | Timestamp — enables 304 Not Modified |
| `Vary: Header` | Different cache per header value |
| `stale-while-revalidate=N` | Serve stale, refresh in background |

**Up next:** Module 6 — Databases with Sequelize. We replace the in-memory array with PostgreSQL.
