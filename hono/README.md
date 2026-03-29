# Node.js Backend Classroom

A 10-module hands-on curriculum for learning backend web development with TypeScript, Node.js, and Express — built for developers who already know the frontend.

---

## Before You Start

You'll need the following installed:

- **Node.js 20+** — check with `node -v`. Install via [nvm](https://github.com/nvm-sh/nvm) if needed
- **Docker Desktop** — required from Module 6 onwards for PostgreSQL
- **VS Code** with the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) — lets you run `.http` files directly in the editor

---

## How the Curriculum Works

Each module is a self-contained folder with its own `package.json`, TypeScript config, and source code. They don't share dependencies — you `npm install` inside each one.

Every module has two parts, in this order:

1. **Sprint** — the minimum code to demonstrate the concept. Get it running, understand the core idea.
2. **Deep dive** — internals, edge cases, gotchas, and exercises. Go as deep as you want.

Each module folder contains:

| File | Purpose |
|------|---------|
| `README.md` | Theory, explanations, and exercises — read this |
| `src/` | TypeScript source code — annotated with explanations |
| `requests.http` | Test requests — run these as you read |

---

## Module Overview

| # | Topic | What you build |
|---|-------|---------------|
| [01](./module-01/) | How HTTP Works | No code — observe real traffic with `curl` and DevTools |
| [02](./module-02/) | Express Fundamentals | A `/echo` server that reflects back everything you send it |
| [03](./module-03/) | Middleware | Custom logger, error handler, Router, CORS |
| [04](./module-04/) | REST API + Validation | Full CRUD API for blog posts, with Zod validation |
| [05](./module-05/) | Caching Headers | Cache-Control, ETags, 304 Not Modified |
| [06](./module-06/) | Database with Sequelize | PostgreSQL + ORM: models, associations, transactions |
| [07](./module-07/) | Sessions & Cookies | Login/logout with server-side sessions |
| [08](./module-08/) | Authentication | bcrypt passwords + JWT access/refresh tokens |
| [09](./module-09/) | Security | helmet, rate limiting, mass assignment protection |
| [10](./module-10/) | Capstone: Reads API | A complete bookmarks API combining everything |

---

## Getting Started: Module 1

Module 1 has no code to run — it's a guided lab using tools you already have.

```bash
open module-01/README.md
```

Work through the lab exercises using `curl` in your terminal and the Network tab in your browser's DevTools. Fill in the notes template at the bottom.

---

## Getting Started: Module 2

This is where you write your first Express server.

```bash
cd module-02
npm install
npm run dev
```

The server starts at `http://localhost:3000`. Open `module-02/requests.http` in VS Code and click **Send Request** above any request to run it. Or copy the `curl` commands from the comments and run them in a terminal.

When you're done experimenting, read `module-02/README.md` for the deep dive.

---

## Modules 3–5

Same pattern — no extra setup needed:

```bash
cd module-03   # (or 04, 05)
npm install
npm run dev
```

---

## Modules 6 and 10 — PostgreSQL via Docker

These modules use a real database. Start it before running the server:

```bash
cd module-06
docker compose up -d   # starts PostgreSQL in the background
cp .env.example .env
npm install
npm run dev            # server syncs the DB schema on startup
```

To stop the database when you're done:

```bash
docker compose down
```

To inspect the database directly:

```bash
docker exec -it module-06-postgres-1 psql -U classroom -d classroom_db
# then try: \dt   (list tables)   SELECT * FROM users;   \q   (quit)
```

Module 10 uses port `5433` to avoid conflicts with Module 6 if both are running.

---

## Recommended Workflow Per Module

1. `cd module-XX && npm install && npm run dev`
2. Read the **Sprint** section of `README.md`
3. Run the first few requests in `requests.http` — observe what happens
4. Read the **Deep Dive** section
5. Run all the requests, including error cases
6. Attempt the **Exercises** at the bottom of the README
7. Move to the next module

---

## Tips

- **Watch the terminal** — from Module 6 onwards, the server logs every SQL query it runs. Reading these is the best way to understand what the ORM is doing.
- **Use `curl -v`** — the `-v` flag shows request and response headers. Essential for understanding caching (Module 5) and cookies (Module 7).
- **Read the source code comments** — the `.ts` files are heavily annotated. The comments explain *why*, not just *what*.
- **Don't skip Module 1** — understanding HTTP before writing Express code means you'll never be confused by what Express is abstracting.
