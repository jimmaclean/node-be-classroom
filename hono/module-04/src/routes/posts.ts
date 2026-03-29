import { Hono } from "hono";
import { z } from "zod";
import {
  CreatePostSchema,
  UpdatePostSchema,
  PostQuerySchema,
  type CreatePostInput,
} from "../schemas/post";

// NOTE: Hono uses new Hono() for sub-routers instead of express.Router()
const router = new Hono();

// ─── In-memory "database" ────────────────────────────────
// A simple array stands in for a real DB — we'll replace this in Module 6.
// This is a great way to build and test API logic without DB complexity.

interface Post {
  id: number;
  title: string;
  body: string;
  tags: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

let posts: Post[] = [
  {
    id: 1,
    title: "Getting Started with TypeScript",
    body: "TypeScript adds static types to JavaScript, catching bugs before runtime...",
    tags: ["typescript", "javascript"],
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Understanding Hono Middleware",
    body: "Middleware functions are the backbone of Hono applications...",
    tags: ["hono", "node"],
    published: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let nextId = 3;

// ─── Helper: parse and return validation errors ──────────

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T } | { errors: z.ZodIssue[] } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { errors: result.error.issues };
  }
  return { data: result.data };
}

// ─── GET /posts ──────────────────────────────────────────
// REST convention: GET on a collection returns a list

router.get("/", async (c) => {
  // Validate query params — they're always strings, zod coerces them
  // NOTE: c.req.query() returns Record<string, string> (same shape as Express req.query)
  const queryResult = PostQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json({ errors: queryResult.error.issues }, 400);
  }

  const { page, limit, published } = queryResult.data;

  let filtered = posts;

  // Filter by published status if the query param was provided
  if (published !== undefined) {
    filtered = posts.filter((p) => p.published === published);
  }

  // Manual pagination — we'll use Sequelize's built-in offset/limit in Module 6
  const total = filtered.length;
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return c.json({
    data: paginated,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ─── GET /posts/:id ──────────────────────────────────────
// REST convention: GET on a specific resource by its identifier

router.get("/:id", (c) => {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: "id must be a positive integer" }, 400);
  }

  const post = posts.find((p) => p.id === id);

  if (!post) {
    return c.json({ error: `Post ${id} not found` }, 404);
  }

  return c.json(post);
});

// ─── POST /posts ─────────────────────────────────────────
// REST convention: POST to a collection creates a new resource

router.post("/", async (c) => {
  // NOTE: c.req.json() is async — always await it
  const body = await c.req.json();
  const parsed = parseBody(CreatePostSchema, body);

  if ("errors" in parsed) {
    // 422 = data was syntactically valid JSON but semantically wrong
    return c.json({ errors: parsed.errors }, 422);
  }

  const input: CreatePostInput = parsed.data;

  const post: Post = {
    id: nextId++,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  posts.push(post);

  // 201 = Created. Convention: return the created resource.
  return c.json(post, 201);
});

// ─── PUT /posts/:id ──────────────────────────────────────
// REST convention: PUT replaces the entire resource (all fields required)

router.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    return c.json({ error: `Post ${id} not found` }, 404);
  }

  // PUT uses the full schema — all fields required
  const body = await c.req.json();
  const parsed = parseBody(CreatePostSchema, body);
  if ("errors" in parsed) {
    return c.json({ errors: parsed.errors }, 422);
  }

  posts[index] = {
    ...posts[index],
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  return c.json(posts[index]);
});

// ─── PATCH /posts/:id ────────────────────────────────────
// REST convention: PATCH updates only the provided fields

router.patch("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    return c.json({ error: `Post ${id} not found` }, 404);
  }

  // PATCH uses the partial schema — all fields optional
  const body = await c.req.json();
  const parsed = parseBody(UpdatePostSchema, body);
  if ("errors" in parsed) {
    return c.json({ errors: parsed.errors }, 422);
  }

  posts[index] = {
    ...posts[index],
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  return c.json(posts[index]);
});

// ─── DELETE /posts/:id ───────────────────────────────────
// REST convention: DELETE removes the resource. Return 204 (no content).

router.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    return c.json({ error: `Post ${id} not found` }, 404);
  }

  posts.splice(index, 1);

  // 204 = success with no response body
  // NOTE: c.body(null, 204) is the Hono equivalent of res.status(204).send()
  return c.body(null, 204);
});

export { router as postsRouter };
