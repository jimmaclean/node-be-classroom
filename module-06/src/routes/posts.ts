import { Router, Request, Response } from "express";
import { Op } from "sequelize";
import { Post } from "../models/Post";
import { User } from "../models/User";

const router = Router();

// GET /posts — paginated list with optional filters
router.get("/", async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  // findAndCountAll = SELECT + COUNT in one query — perfect for pagination
  const { count, rows } = await Post.findAndCountAll({
    where: req.query.published !== undefined
      ? { published: req.query.published === "true" }
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

  res.json({
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
router.get("/search", async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    res.status(400).json({ error: "q query param is required" });
    return;
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

  res.json(posts);
});

// GET /posts/:id
router.get("/:id", async (req: Request, res: Response) => {
  const post = await Post.findByPk(Number(req.params.id), {
    include: [{ model: User, attributes: ["id", "name", "email"] }],
  });

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(post);
});

// POST /posts
router.post("/", async (req: Request, res: Response) => {
  const { title, body, tags, published, userId } = req.body as {
    title?: string;
    body?: string;
    tags?: string[];
    published?: boolean;
    userId?: number;
  };

  if (!title || !body || !userId) {
    res.status(422).json({ error: "title, body, and userId are required" });
    return;
  }

  // Verify the user exists before creating the post
  const user = await User.findByPk(userId);
  if (!user) {
    res.status(404).json({ error: `User ${userId} not found` });
    return;
  }

  const post = await Post.create({ title, body, tags: tags ?? [], published: published ?? false, userId });
  res.status(201).json(post);
});

// PATCH /posts/:id — partial update
router.patch("/:id", async (req: Request, res: Response) => {
  const post = await Post.findByPk(Number(req.params.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  // update() = UPDATE posts SET ... WHERE id = ?
  // Only updates fields that are passed — Sequelize ignores undefined keys
  await post.update(req.body);

  res.json(post);
});

// DELETE /posts/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const post = await Post.findByPk(Number(req.params.id));

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  // destroy() = DELETE FROM posts WHERE id = ?
  await post.destroy();
  res.status(204).send();
});

// ─── Transaction example ─────────────────────────────────
// POST /posts/with-user — create a user and a post atomically
//
// If either fails, BOTH are rolled back — no partial data in the DB
router.post("/with-user", async (req: Request, res: Response) => {
  const sequelize = Post.sequelize!;

  // t is the transaction object — pass it to every DB call inside
  const result = await sequelize.transaction(async (t) => {
    const user = await User.create(
      { name: req.body.userName, email: req.body.userEmail },
      { transaction: t }
    );

    const post = await Post.create(
      {
        title: req.body.title,
        body: req.body.body,
        userId: user.id,
      },
      { transaction: t }
    );

    return { user, post };
  });

  res.status(201).json(result);
});

export { router as postsRouter };
