import { Hono } from "hono";
import { User } from "../models/User";
import { Post } from "../models/Post";

const router = new Hono();

// GET /users — list all users
router.get("/", async (c) => {
  // findAll() = SELECT * FROM users
  const users = await User.findAll({
    order: [["createdAt", "DESC"]],
  });
  return c.json(users);
});

// GET /users/:id — get a user with their posts
router.get("/:id", async (c) => {
  const user = await User.findByPk(Number(c.req.param("id")), {
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
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

// POST /users — create a user
router.post("/", async (c) => {
  const { name, email } = await c.req.json() as { name?: string; email?: string };

  if (!name || !email) {
    return c.json({ error: "name and email are required" }, 422);
  }

  try {
    // create() = INSERT INTO users (...) VALUES (...)
    const user = await User.create({ name, email });
    return c.json(user, 201);
  } catch (err: unknown) {
    // Sequelize throws UniqueConstraintError for duplicate email
    if (err instanceof Error && err.name === "SequelizeUniqueConstraintError") {
      return c.json({ error: "Email already exists" }, 409);
    }
    throw err;
  }
});

export { router as usersRouter };
