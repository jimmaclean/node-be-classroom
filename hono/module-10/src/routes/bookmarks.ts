import { Hono } from "hono";
import { Op } from "sequelize";
import { z } from "zod";
import { Bookmark } from "../models/Bookmark";
import { Tag } from "../models/Tag";
import { requireAuth } from "../middleware/requireAuth";
import type { AccessTokenPayload } from "../lib/jwt";

const router = new Hono();

// All bookmark routes require authentication
router.use(requireAuth);

// ─── Schemas ──────────────────────────────────────────────

const CreateBookmarkSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  url: z.string().url("Must be a valid URL"),
  notes: z.string().max(2000).trim().optional(),
  favourite: z.boolean().optional().default(false),
  tags: z.array(z.string().min(1).max(50).toLowerCase().trim()).max(10).optional().default([]),
});

const UpdateBookmarkSchema = CreateBookmarkSchema.partial();

const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  tag: z.string().optional(),
  favourite: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  q: z.string().optional(),
});

// ─── Helper: find or create tags ─────────────────────────

async function upsertTags(tagNames: string[]): Promise<Tag[]> {
  return Promise.all(
    tagNames.map((name) => Tag.findOrCreate({ where: { name } }).then(([tag]) => tag))
  );
}

// ─── GET /bookmarks ───────────────────────────────────────

router.get("/", async (c) => {
  const queryResult = ListQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json({ errors: queryResult.error.issues }, 400);
  }

  const { page, limit, tag, favourite, q } = queryResult.data;
  const offset = (page - 1) * limit;
  const currentUser = c.get("user") as AccessTokenPayload;

  // Build the where clause dynamically
  const where: Record<string, unknown> = {
    userId: currentUser.sub, // users only see their own bookmarks
  };

  if (favourite !== undefined) where.favourite = favourite;

  if (q) {
    where[Op.or as unknown as string] = [
      { title: { [Op.iLike]: `%${q}%` } },
      { notes: { [Op.iLike]: `%${q}%` } },
      { url: { [Op.iLike]: `%${q}%` } },
    ];
  }

  const includeOptions = [
    {
      model: Tag,
      attributes: ["id", "name"],
      through: { attributes: [] }, // don't include junction table columns
      // Filter by tag name if provided
      ...(tag ? { where: { name: tag.toLowerCase() } } : {}),
    },
  ];

  const { count, rows } = await Bookmark.findAndCountAll({
    where,
    include: includeOptions,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    // Required: true would do INNER JOIN (only bookmarks with that tag)
    // Required: false does LEFT JOIN (all bookmarks, filtered in JS) — correct behaviour when no tag filter
  });

  // Cache public-ish data briefly (all user's bookmarks — private cache)
  c.header("Cache-Control", "private, max-age=30");

  return c.json({
    data: rows,
    meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  });
});

// ─── GET /bookmarks/:id ───────────────────────────────────

router.get("/:id", async (c) => {
  const currentUser = c.get("user") as AccessTokenPayload;
  const bookmark = await Bookmark.findOne({
    where: { id: Number(c.req.param("id")), userId: currentUser.sub },
    include: [{ model: Tag, attributes: ["id", "name"], through: { attributes: [] } }],
  });

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  return c.json(bookmark);
});

// ─── POST /bookmarks ──────────────────────────────────────

router.post("/", async (c) => {
  const body = await c.req.json();
  const result = CreateBookmarkSchema.safeParse(body);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 422);
  }

  const { tags: tagNames, ...bookmarkData } = result.data;
  const currentUser = c.get("user") as AccessTokenPayload;

  const bookmark = await Bookmark.create({
    ...bookmarkData,
    userId: currentUser.sub,
  });

  if (tagNames.length > 0) {
    const tags = await upsertTags(tagNames);
    await (bookmark as Bookmark & { setTags: (tags: Tag[]) => Promise<void> }).setTags(tags);
  }

  // Re-fetch with tags to return complete object
  const withTags = await Bookmark.findByPk(bookmark.id, {
    include: [{ model: Tag, attributes: ["id", "name"], through: { attributes: [] } }],
  });

  return c.json(withTags, 201);
});

// ─── PATCH /bookmarks/:id ─────────────────────────────────

router.patch("/:id", async (c) => {
  const currentUser = c.get("user") as AccessTokenPayload;
  const bookmark = await Bookmark.findOne({
    where: { id: Number(c.req.param("id")), userId: currentUser.sub },
  });

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  const body = await c.req.json();
  const result = UpdateBookmarkSchema.safeParse(body);
  if (!result.success) {
    return c.json({ errors: result.error.issues }, 422);
  }

  const { tags: tagNames, ...updateData } = result.data;

  await bookmark.update(updateData);

  if (tagNames !== undefined) {
    const tags = await upsertTags(tagNames);
    await (bookmark as Bookmark & { setTags: (tags: Tag[]) => Promise<void> }).setTags(tags);
  }

  const updated = await Bookmark.findByPk(bookmark.id, {
    include: [{ model: Tag, attributes: ["id", "name"], through: { attributes: [] } }],
  });

  return c.json(updated);
});

// ─── DELETE /bookmarks/:id ────────────────────────────────

router.delete("/:id", async (c) => {
  const currentUser = c.get("user") as AccessTokenPayload;
  const bookmark = await Bookmark.findOne({
    where: { id: Number(c.req.param("id")), userId: currentUser.sub },
  });

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404);
  }

  await bookmark.destroy();
  return c.body(null, 204);
});

// ─── GET /bookmarks/meta/tags — all tags for this user ────

router.get("/meta/tags", async (c) => {
  const currentUser = c.get("user") as AccessTokenPayload;
  // Get all tags used by this user's bookmarks
  const tags = await Tag.findAll({
    include: [
      {
        model: Bookmark,
        where: { userId: currentUser.sub },
        attributes: [],
        through: { attributes: [] },
        required: true,
      },
    ],
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
  });

  return c.json(tags);
});

export { router as bookmarksRouter };
