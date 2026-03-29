import { Hono } from "hono";
import { Op } from "sequelize";
import { Post } from "../models/Post";
import { User } from "../models/User";

const router = new Hono();

// GET /posts — paginated list with optional filters
router.get("/", async (c) => {
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 10));
  const offset = (page - 1) * limit;

  // findAndCountAll = SELECT + COUNT in one query — perfect for pagination
  const { count, rows } = await Post.findAndCountAll({
    where: c.req.query("published") !== undefined
      ? { published: c.req.query("published") === "true" }
      : {},
    include: [
      {
        model: User,
        attributes: ["id", "name"], // only include name, not email
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return c.json({
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  });
});

// GET /posts/search?q=typescript — full-text search using ILIKE
router.get("/search", async (c) => {
  const q = String(c.req.query("q") || "").trim();

  if (!q) {
    return c.json({ error: "q query param is required" }, 400);
  }

  // Op.iLike = case-insensitive LIKE (PostgreSQL-specific)
  // Sequelize parameterizes this automatically — no SQL injection risk
  const posts = await Post.findAll({
    where: {
      [Op.or]: [
        { title: { [Op.iLike]: `%${q}%` } },
        { body: { [Op.iLike]: `%${q}%` } },
      ],
    },
    include: [{ model: User, attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
    limit: 20,
  });

  return c.json(posts);
});

// GET /posts/:id
router.get("/:id", async (c) => {
  const post = await Post.findByPk(Number(c.req.param("id")), {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json(post);
});

// POST /posts
router.post("/", async (c) => {
  const { title, body, tags, published, userId } = await c.req.json() as {
    title?: string;
    body?: string;
    tags?: string[];
    published?: boolean;
    userId?: number;
  };

  if (!title || !body || !userId) {
    return c.json({ error: "title, body, and userId are required" }, 422);
  }

  // Verify the user exists before creating the post
  const user = await User.findByPk(userId);
  if (!user) {
    return c.json({ error: `User ${userId} not found` }, 404);
  }

  const post = await Post.create({ title, body, tags: tags ?? [], published: published ?? false, userId });
  return c.json(post, 201);
});

// PATCH /posts/:id — partial update
router.patch("/:id", async (c) => {
  const post = await Post.findByPk(Number(c.req.param("id")));

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // update() = UPDATE posts SET ... WHERE id = ?
  // Only updates fields that are passed — Sequelize ignores undefined keys
  const body = await c.req.json();
  await post.update(body);

  return c.json(post);
});

// DELETE /posts/:id
router.delete("/:id", async (c) => {
  const post = await Post.findByPk(Number(c.req.param("id")));

  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // destroy() = DELETE FROM posts WHERE id = ?
  await post.destroy();
  return c.body(null, 204);
});

// ─── Transaction example ─────────────────────────────────
// POST /posts/with-user — create a user and a post atomically
//
// If either fails, BOTH are rolled back — no partial data in the DB
router.post("/with-user", async (c) => {
  const body = await c.req.json();
  const sequelize = Post.sequelize!;

  // t is the transaction object — pass it to every DB call inside
  const result = await sequelize.transaction(async (t) => {
    const user = await User.create(
      { name: body.userName, email: body.userEmail },
      { transaction: t }
    );

    const post = await Post.create(
      {
        title: body.title,
        body: body.body,
        userId: user.id,
      },
      { transaction: t }
    );

    return { user, post };
  });

  return c.json(result, 201);
});

export { router as postsRouter };
