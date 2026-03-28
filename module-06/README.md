# Module 6 — Databases with Sequelize (PostgreSQL)

---

## Setup

```bash
cd module-06

# 1. Start PostgreSQL in Docker
docker compose up -d

# 2. Create your .env file
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start the server (it syncs the DB schema automatically)
npm run dev
```

The server calls `sequelize.sync({ alter: true })` on startup — it creates the `users` and `posts` tables if they don't exist.

Verify the tables exist:
```bash
docker exec -it module-06-postgres-1 psql -U classroom -d classroom_db -c "\dt"
```

---

## Part 1: Sprint — Store and Retrieve Data

The in-memory array from Module 4 is gone. Data now persists across restarts.

**Watch the terminal while making requests** — you'll see the actual SQL queries Sequelize generates. This is the most important part of learning an ORM: understanding what SQL it produces.

```bash
# Create a user, then create a post for that user
POST /users     { "name": "James", "email": "james@example.com" }
POST /posts     { "title": "...", "body": "...", "userId": 1 }
GET  /posts/1   ← includes user info via SQL JOIN
```

---

## Part 2: Deep Dive

### Why SQL + ORM?

**SQL** (Structured Query Language) is how you talk to relational databases. Data lives in **tables** (like spreadsheets) with defined columns and types:

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**An ORM** (Object-Relational Mapper) lets you write TypeScript instead of SQL:

```typescript
// Instead of: INSERT INTO users (name, email) VALUES ('James', 'j@x.com')
const user = await User.create({ name: "James", email: "j@x.com" });

// Instead of: SELECT * FROM users WHERE id = 1
const user = await User.findByPk(1);
```

The ORM translates your TypeScript into SQL automatically. You still need to understand SQL to debug issues and write complex queries.

### Models

A model class maps to a database table. Each property maps to a column:

```typescript
@Table({ tableName: "posts", underscored: true })
class Post extends Model {
  @Column(DataType.STRING)   // VARCHAR(255)
  title!: string;

  @Column(DataType.TEXT)     // unlimited text
  body!: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  published!: boolean;
}
```

`underscored: true` converts camelCase JS names to snake_case DB column names:
- `createdAt` → `created_at`
- `userId` → `user_id`

### CRUD Methods

```typescript
// CREATE — INSERT INTO posts ...
const post = await Post.create({ title, body, userId });

// READ all — SELECT * FROM posts
const posts = await Post.findAll();

// READ one — SELECT * FROM posts WHERE id = 1
const post = await Post.findByPk(1);

// READ with conditions — SELECT * FROM posts WHERE published = true
const posts = await Post.findAll({ where: { published: true } });

// UPDATE — UPDATE posts SET published = true WHERE id = 1
await post.update({ published: true });

// DELETE — DELETE FROM posts WHERE id = 1
await post.destroy();
```

### Associations

Associations are relationships between tables:

```typescript
// One User has many Posts
@HasMany(() => Post)
posts!: Post[];

// Each Post belongs to one User
@BelongsTo(() => User)
user!: User;

// In the DB: posts table has a user_id column referencing users.id
```

Loading associated data:
```typescript
// Without include: two separate queries (N+1 problem)
const posts = await Post.findAll();
for (const post of posts) {
  const user = await post.getUser(); // query per post!
}

// With include: one JOIN query (efficient)
const posts = await Post.findAll({
  include: [{ model: User }], // LEFT JOIN users ON posts.user_id = users.id
});
```

Always use `include` instead of loading associations in a loop.

### The N+1 Problem

The most common ORM performance mistake:

```typescript
// BAD: N+1 queries — 1 query to get posts + 1 query per post to get user
const posts = await Post.findAll();
for (const post of posts) {
  const user = await User.findByPk(post.userId); // separate query each time
}

// GOOD: 1 query with JOIN
const posts = await Post.findAll({
  include: [{ model: User, attributes: ["id", "name"] }],
});
```

### Operators

```typescript
import { Op } from "sequelize";

// WHERE published = true AND created_at > '2024-01-01'
await Post.findAll({
  where: {
    published: true,
    createdAt: { [Op.gt]: new Date("2024-01-01") },
  },
});

// WHERE title LIKE '%typescript%' (case-insensitive, postgres only)
await Post.findAll({
  where: { title: { [Op.iLike]: "%typescript%" } },
});

// WHERE id IN (1, 2, 3)
await Post.findAll({
  where: { id: { [Op.in]: [1, 2, 3] } },
});
```

### Transactions

Transactions ensure multiple DB operations succeed or fail together — no partial data:

```typescript
const result = await sequelize.transaction(async (t) => {
  const user = await User.create({ name, email }, { transaction: t });
  const post = await Post.create({ title, userId: user.id }, { transaction: t });
  return { user, post };
  // If anything throws here, BOTH operations are rolled back
});
```

Use transactions whenever you need more than one related write operation.

### `sync` vs Migrations

`sequelize.sync({ alter: true })` is convenient in development — it auto-updates the schema. But in production:

- `sync` can fail silently or do unexpected things to existing data
- **Migrations** are explicit SQL operations with `up` (apply) and `down` (revert)
- Migrations give you a history of schema changes and let you roll back

For production use, run `npm run migrate` instead of relying on `sync`.

---

## Exercises

1. Add a `bio` column to the `User` model (optional, TEXT). Watch what SQL `sync({ alter: true })` generates
2. Query posts created in the last 7 days using `Op.gte` and JavaScript's `Date`
3. Add a `GET /users/:id/posts` route that lists only that user's posts
4. Write a query that returns the count of posts per user (hint: use `Post.count({ group: ["userId"] })`)
5. **Challenge:** Implement soft delete — instead of `destroy()`, add a `deletedAt` column and set it on "deletion". Filter `deletedAt: null` on all reads. (Sequelize has built-in `paranoid: true` support — look it up)

---

## Key Takeaways

| Concept | Key point |
|---------|-----------|
| Model | TypeScript class = database table |
| `findAll` | SELECT — supports where, order, limit, offset |
| `findByPk` | SELECT by primary key |
| `create` | INSERT |
| `update` | UPDATE |
| `destroy` | DELETE |
| `include` | JOIN — load associated models in one query |
| `Op.*` | Operators: `gt`, `lt`, `iLike`, `in`, `or`, etc. |
| Transaction | Multiple writes that succeed or fail together |

**Up next:** Module 7 — Sessions & Cookies. Making your server remember who's logged in.
