import { Sequelize } from "sequelize-typescript";
import { User } from "./models/User";
import { Bookmark } from "./models/Bookmark";
import { Tag } from "./models/Tag";
import { BookmarkTag } from "./models/BookmarkTag";

const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
  dialect: "postgres",
  models: [User, Bookmark, Tag, BookmarkTag],
  logging: process.env.NODE_ENV === "development"
    ? (sql: string) => console.log(`\x1b[35m[SQL]\x1b[0m ${sql}`)
    : false,
});

export default sequelize;
