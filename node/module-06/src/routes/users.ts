import { Router, Request, Response } from "express";
import { User } from "../models/User";
import { Post } from "../models/Post";

const router = Router();

// GET /users — list all users
router.get("/", async (_req: Request, res: Response) => {
  // findAll() = SELECT * FROM users
  const users = await User.findAll({
    order: [["createdAt", "DESC"]],
  });
  res.json(users);
});

// GET /users/:id — get a user with their posts
router.get("/:id", async (req: Request, res: Response) => {
  const user = await User.findByPk(Number(req.params.id), {
    // include = SQL JOIN — loads associated posts in one query
    include: [
      {
        model: Post,
        // Only include specific columns from the joined table
        attributes: ["id", "title", "published", "createdAt"],
      },
    ],
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
});

// POST /users — create a user
router.post("/", async (req: Request, res: Response) => {
  const { name, email } = req.body as { name?: string; email?: string };

  if (!name || !email) {
    res.status(422).json({ error: "name and email are required" });
    return;
  }

  try {
    // create() = INSERT INTO users (...) VALUES (...)
    const user = await User.create({ name, email });
    res.status(201).json(user);
  } catch (err: unknown) {
    // Sequelize throws UniqueConstraintError for duplicate email
    if (err instanceof Error && err.name === "SequelizeUniqueConstraintError") {
      res.status(409).json({ error: "Email already exists" });
      return;
    }
    throw err;
  }
});

export { router as usersRouter };
