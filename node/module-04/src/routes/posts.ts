import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  CreatePostSchema,
  UpdatePostSchema,
  PostQuerySchema,
  type CreatePostInput,
} from "../schemas/post";

const router = Router();

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
    title: "Understanding Express Middleware",
    body: "Middleware functions are the backbone of Express applications...",
    tags: ["express", "node"],
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

router.get("/", (req: Request, res: Response) => {
  // Validate query params — they're always strings, zod coerces them
  const queryResult = PostQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ errors: queryResult.error.issues });
    return;
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

  res.json({
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

router.get("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const post = posts.find((p) => p.id === id);

  if (!post) {
    res.status(404).json({ error: `Post ${id} not found` });
    return;
  }

  res.json(post);
});

// ─── POST /posts ─────────────────────────────────────────
// REST convention: POST to a collection creates a new resource

router.post("/", (req: Request, res: Response) => {
  const parsed = parseBody(CreatePostSchema, req.body);

  if ("errors" in parsed) {
    // 422 = data was syntactically valid JSON but semantically wrong
    res.status(422).json({ errors: parsed.errors });
    return;
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
  res.status(201).json(post);
});

// ─── PUT /posts/:id ──────────────────────────────────────
// REST convention: PUT replaces the entire resource (all fields required)

router.put("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: `Post ${id} not found` });
    return;
  }

  // PUT uses the full schema — all fields required
  const parsed = parseBody(CreatePostSchema, req.body);
  if ("errors" in parsed) {
    res.status(422).json({ errors: parsed.errors });
    return;
  }

  posts[index] = {
    ...posts[index],
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  res.json(posts[index]);
});

// ─── PATCH /posts/:id ────────────────────────────────────
// REST convention: PATCH updates only the provided fields

router.patch("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: `Post ${id} not found` });
    return;
  }

  // PATCH uses the partial schema — all fields optional
  const parsed = parseBody(UpdatePostSchema, req.body);
  if ("errors" in parsed) {
    res.status(422).json({ errors: parsed.errors });
    return;
  }

  posts[index] = {
    ...posts[index],
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  };

  res.json(posts[index]);
});

// ─── DELETE /posts/:id ───────────────────────────────────
// REST convention: DELETE removes the resource. Return 204 (no content).

router.delete("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: `Post ${id} not found` });
    return;
  }

  posts.splice(index, 1);

  // 204 = success with no response body
  res.status(204).send();
});

export { router as postsRouter };
