# Module 10 — Capstone: "Reads" Bookmarks API

You've arrived. This is a production-realistic REST API that combines every concept from the previous nine modules.

---

## Setup

```bash
cd module-10

# 1. Start PostgreSQL
docker compose up -d

# 2. Configure environment
cp .env.example .env
# Edit .env and set strong secrets (run the command in .env.example to generate them)

# 3. Install and start
npm install
npm run dev
```

The server starts at `http://localhost:3000`. It automatically creates the database tables on startup.

---

## What's in This API

### Features
- **User accounts**: register, login, JWT auth, token refresh
- **Bookmarks**: CRUD with title, URL, notes, favourite flag
- **Tags**: many-to-many relationship — tag your bookmarks
- **Filtering**: by tag, favourite, or full-text search
- **Pagination**: on all list endpoints
- **Caching**: `Cache-Control: private, max-age=30` on list endpoints
- **Security**: helmet, CORS, rate limiting, bcrypt, JWT, input validation
- **Authorization**: users only see their own bookmarks (IDOR protection)

### API Endpoints

```
POST   /auth/register       Create account
POST   /auth/login          Get access + refresh tokens
POST   /auth/refresh        Exchange refresh token for new access token
POST   /auth/logout         Revoke refresh token
GET    /auth/me             Current user info

GET    /bookmarks           List bookmarks (paginated, filterable)
POST   /bookmarks           Create a bookmark
GET    /bookmarks/:id       Get one bookmark
PATCH  /bookmarks/:id       Update a bookmark
DELETE /bookmarks/:id       Delete a bookmark
GET    /bookmarks/meta/tags All tags used by this user

GET    /health              Health check
```

---

## Concepts Map

| Module | Concept | Where it appears in this code |
|--------|---------|-------------------------------|
| 1 | HTTP methods/status codes | All routes use correct methods and codes |
| 2 | Express req/res | Every route handler |
| 3 | Middleware chain | helmet → cors → json → morgan → rate limit → routes |
| 4 | REST design + Zod | URL structure, CreateBookmarkSchema, ListQuerySchema |
| 5 | Cache-Control | `private, max-age=30` on GET /bookmarks |
| 6 | Sequelize + associations | Bookmark ↔ Tag (many-to-many), User ↔ Bookmark |
| 7 | (sessions replaced by JWT) | — |
| 8 | bcrypt + JWT | auth routes, requireAuth middleware |
| 9 | helmet, rate limit, validation | security setup in server.ts |

---

## Architecture Walk-Through

```
src/
├── server.ts           ← entry point: middleware stack + route mounting
├── db.ts               ← Sequelize instance with all models registered
├── models/
│   ├── User.ts         ← users table
│   ├── Bookmark.ts     ← bookmarks table (belongs to User, has many Tags)
│   ├── Tag.ts          ← tags table (belongs to many Bookmarks)
│   └── BookmarkTag.ts  ← junction table (bookmark_tags)
├── routes/
│   ├── auth.ts         ← register, login, refresh, logout, me
│   └── bookmarks.ts    ← CRUD + filtering + tags
├── middleware/
│   └── requireAuth.ts  ← JWT verification, attaches req.user
└── lib/
    └── jwt.ts          ← sign and verify access/refresh tokens
```

### Database Schema

```
users
  id           SERIAL PRIMARY KEY
  name         VARCHAR
  email        VARCHAR UNIQUE
  password_hash VARCHAR
  created_at   TIMESTAMPTZ

bookmarks
  id           SERIAL PRIMARY KEY
  title        VARCHAR
  url          VARCHAR
  notes        TEXT
  favourite    BOOLEAN DEFAULT false
  user_id      INT REFERENCES users(id)
  created_at   TIMESTAMPTZ

tags
  id           SERIAL PRIMARY KEY
  name         VARCHAR UNIQUE

bookmark_tags (junction table)
  bookmark_id  INT REFERENCES bookmarks(id)
  tag_id       INT REFERENCES tags(id)
```

### The Many-to-Many: Bookmark ↔ Tag

A bookmark can have many tags. A tag can be on many bookmarks. This requires a **junction table** (`bookmark_tags`).

Sequelize handles this with `BelongsToMany`:
```typescript
// On Bookmark model:
@BelongsToMany(() => Tag, () => BookmarkTag)
tags!: Tag[];

// On Tag model:
@BelongsToMany(() => Bookmark, () => BookmarkTag)
bookmarks!: Bookmark[];
```

When you create a bookmark with tags:
1. Each tag name is "find or created" in the `tags` table
2. Rows are inserted into `bookmark_tags` linking them
3. Sequelize handles the SQL — you just call `bookmark.setTags(tags)`

### Authorization vs Authentication

This code demonstrates an important distinction:

```typescript
// Authentication: are you logged in? (requireAuth middleware)
router.use(requireAuth);

// Authorization: are you allowed to see THIS resource?
const bookmark = await Bookmark.findOne({
  where: {
    id: Number(req.params.id),
    userId: req.user!.sub,  // ← only this user's bookmarks
  },
});
// → null if bookmark exists but belongs to someone else → 404
```

Always filter by the authenticated user's ID, not just the resource ID. Without this, user A could read/modify user B's bookmarks (IDOR vulnerability).

---

## Extension Challenges

These aren't guided — figure them out using what you've learned:

1. **Soft delete**: add `deletedAt` to Bookmark. Instead of `destroy()`, set `deletedAt = new Date()`. Filter it out of all queries
2. **Search autocomplete**: add `GET /bookmarks/tags/search?q=type` that returns tags starting with the query (for a frontend autocomplete input)
3. **Export**: add `GET /bookmarks/export` that returns all bookmarks as CSV (set `Content-Type: text/csv` and `Content-Disposition: attachment; filename="bookmarks.csv"`)
4. **Sharing**: add a `public` boolean to Bookmark. Create `GET /share/:userId/bookmarks` that returns a user's public bookmarks without auth
5. **Rate limit by user**: change the rate limiter on `/bookmarks` to use `req.user.sub` as the key (per-user limit instead of per-IP)
6. **Webhook**: when a bookmark is created, POST the bookmark data to a configurable URL in `.env` (simulate a webhook)

---

## You Now Know

Working your way through these modules, you've gone from "frontend only" to understanding:

- How HTTP requests and responses actually work
- How a Node.js server accepts and handles those requests
- How middleware pipelines work
- How to design and build REST APIs
- How caching headers control what browsers and CDNs store
- How to persist data in PostgreSQL using an ORM
- How server sessions and cookies work
- How to hash passwords and implement JWT authentication
- How to secure an API against common attacks

The gap between frontend and backend knowledge is gone. You can now read, understand, and contribute to full-stack codebases — and build your own APIs from scratch.
