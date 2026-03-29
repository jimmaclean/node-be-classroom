# Module 4 — REST API Design + Input Validation

---

## Setup

```bash
cd module-04
cp .env.example .env
npm install
npm run dev
```

---

## Part 1: Sprint — A Complete CRUD API in 5 Minutes

You now have a fully working REST API for blog posts. No database yet — data lives in memory and resets on server restart — but the HTTP interface is production-correct.

```
GET    /posts         → list posts (paginated, filterable)
GET    /posts/:id     → get one post
POST   /posts         → create a post (validates body)
PUT    /posts/:id     → replace a post (all fields required)
PATCH  /posts/:id     → update a post (only send changed fields)
DELETE /posts/:id     → delete a post (returns 204)
```

Try the requests in `requests.http` and observe how validation errors look.

---

## Part 2: Deep Dive

### REST Principles

REST (Representational State Transfer) is a set of conventions, not a spec:

1. **Resources** — everything is a noun, not a verb. `/posts`, not `/getPosts`
2. **HTTP methods carry intent** — GET reads, POST creates, PUT/PATCH updates, DELETE removes
3. **Stateless** — each request contains all info needed to process it; no session state on the server (we revisit this in Module 7)
4. **Uniform interface** — URLs follow a predictable pattern

**Good REST URL design:**
```
GET    /users              list users
POST   /users              create a user
GET    /users/42           get user 42
PUT    /users/42           replace user 42
PATCH  /users/42           update user 42
DELETE /users/42           delete user 42
GET    /users/42/posts     list posts belonging to user 42
POST   /users/42/posts     create a post for user 42
```

**Anti-patterns to avoid:**
```
GET /getUser?id=42        ❌ verb in URL
POST /deletePost/5        ❌ wrong method
GET /user/all             ❌ "all" is meaningless — just GET /users
```

### Zod — Schema-First Validation

Zod is a TypeScript-first validation library. The key insight: **define the schema once, get both runtime validation and TypeScript types for free**.

```typescript
const CreatePostSchema = z.object({
  title: z.string().min(3).max(100).trim(),
  tags: z.array(z.string()).max(5).default([]),
});

// Infer the TypeScript type — no duplication
type CreatePostInput = z.infer<typeof CreatePostSchema>;
// → { title: string; tags: string[] }
```

Without Zod you'd write:
```typescript
interface CreatePostInput {
  title: string;
  tags: string[];
}
// Then separately validate at runtime...
// Then keep the two in sync manually...
```

**`parse` vs `safeParse`:**
```typescript
// parse — throws ZodError on failure
const data = CreatePostSchema.parse(req.body);

// safeParse — returns a result object, never throws
const result = CreatePostSchema.safeParse(req.body);
if (!result.success) {
  // result.error.issues = array of field-level errors
}
```

Use `safeParse` in route handlers so you control the response.

### Query String Coercion

Query strings are always strings — `?page=2` gives you `"2"`, not `2`.

Zod handles this elegantly:
```typescript
const QuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  // z.coerce.number() calls Number() on the value before validating
});
```

### Pagination Pattern

The `meta` envelope is a common convention:
```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 2,
    "limit": 10,
    "totalPages": 5
  }
}
```

Clients use `totalPages` to know when to stop requesting more pages.

### PUT vs PATCH

| | PUT | PATCH |
|--|-----|-------|
| Fields required | All | Only what's changing |
| Semantics | Replace the resource entirely | Partial update |
| Idempotent | Yes | Usually |

Example: publishing a post with PATCH:
```bash
curl -X PATCH /posts/1 -d '{"published": true}'
```

With PUT you'd have to send all fields even if only `published` changed.

### Environment Variables

`.env` files store config that varies between environments (dev, staging, prod):

```bash
# .env (never commit this)
PORT=3000
DATABASE_URL=postgres://localhost/mydb
JWT_SECRET=super-secret-key
```

```typescript
import "dotenv/config"; // loads .env into process.env
const PORT = Number(process.env.PORT) || 3000;
```

Always commit `.env.example` with placeholder values — it documents what variables are needed without exposing secrets.

---

## Exercises

1. Add a `GET /posts/tags` endpoint that returns all unique tags across all posts
2. Add a `?tag=typescript` filter to `GET /posts` to filter by a single tag
3. Add an `author` field to the schema (string, required, min 2 chars). Update the seed data and all relevant tests
4. What status code should you return if someone tries to create a post with a title that already exists? Implement it
5. **Challenge:** Add a `sort` query param (`sort=createdAt:asc` or `sort=title:desc`) and apply it to the list endpoint. Validate the format with Zod using `.refine()`

---

## Key Takeaways

| Concept | Key point |
|---------|-----------|
| REST URLs | Nouns, not verbs. Methods carry the action. |
| Status codes | 201 for creation, 204 for no-body responses, 422 for validation failures |
| Zod | Schema = validation + TypeScript type, one source of truth |
| PUT vs PATCH | PUT replaces entirely, PATCH updates partially |
| Query strings | Always strings — use `z.coerce` to convert |
| `dotenv` | Loads `.env` into `process.env` at startup |

**Up next:** Module 5 — Caching Headers. The most misunderstood part of HTTP.
