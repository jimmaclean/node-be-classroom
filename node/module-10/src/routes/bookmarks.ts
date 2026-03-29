import { Router, Request, Response } from "express";
import { Op } from "sequelize";
import { z } from "zod";
import { Bookmark } from "../models/Bookmark";
import { Tag } from "../models/Tag";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

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

router.get("/", async (req: Request, res: Response) => {
  const queryResult = ListQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    res.status(400).json({ errors: queryResult.error.issues });
    return;
  }

  const { page, limit, tag, favourite, q } = queryResult.data;
  const offset = (page - 1) * limit;

  // Build the where clause dynamically
  const where: Record<string, unknown> = {
    userId: req.user!.sub, // users only see their own bookmarks
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
  res.set("Cache-Control", "private, max-age=30");

  res.json({
    data: rows,
    meta: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
  });
});

// ─── GET /bookmarks/:id ───────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const bookmark = await Bookmark.findOne({
    where: { id: Number(req.params.id), userId: req.user!.sub },
    include: [{ model: Tag, attributes: ["id", "name"], through: { attributes: [] } }],
  });

  if (!bookmark) {
    res.status(404).json({ error: "Bookmark not found" });
    return;
  }

  res.json(bookmark);
});

// ─── POST /bookmarks ──────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const result = CreateBookmarkSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ errors: result.error.issues });
    return;
  }

  const { tags: tagNames, ...bookmarkData } = result.data;

  const bookmark = await Bookmark.create({
    ...bookmarkData,
    userId: req.user!.sub,
  });

  if (tagNames.length > 0) {
    const tags = await upsertTags(tagNames);
    await (bookmark as Bookmark & { setTags: (tags: Tag[]) => Promise<void> }).setTags(tags);
  }

  // Re-fetch with tags to return complete object
  const withTags = await Bookmark.findByPk(bookmark.id, {
    include: [{ model: Tag, attributes: ["id", "name"], through: { attributes: [] } }],
  });

  res.status(201).json(withTags);
});

// ─── PATCH /bookmarks/:id ─────────────────────────────────

router.patch("/:id", async (req: Request, res: Response) => {
  const bookmark = await Bookmark.findOne({
    where: { id: Number(req.params.id), userId: req.user!.sub },
  });

  if (!bookmark) {
    res.status(404).json({ error: "Bookmark not found" });
    return;
  }

  const result = UpdateBookmarkSchema.safeParse(req.body);
  if (!result.success) {
    res.status(422).json({ errors: result.error.issues });
    return;
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

  res.json(updated);
});

// ─── DELETE /bookmarks/:id ────────────────────────────────

router.delete("/:id", async (req: Request, res: Response) => {
  const bookmark = await Bookmark.findOne({
    where: { id: Number(req.params.id), userId: req.user!.sub },
  });

  if (!bookmark) {
    res.status(404).json({ error: "Bookmark not found" });
    return;
  }

  await bookmark.destroy();
  res.status(204).send();
});

// ─── GET /bookmarks/tags — all tags for this user ────────

router.get("/meta/tags", async (req: Request, res: Response) => {
  // Get all tags used by this user's bookmarks
  const tags = await Tag.findAll({
    include: [
      {
        model: Bookmark,
        where: { userId: req.user!.sub },
        attributes: [],
        through: { attributes: [] },
        required: true,
      },
    ],
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
  });

  res.json(tags);
});

export { router as bookmarksRouter };
