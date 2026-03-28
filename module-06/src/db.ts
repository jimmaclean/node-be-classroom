import { Sequelize } from "sequelize-typescript";
import { User } from "./models/User";
import { Post } from "./models/Post";

// Sequelize is the ORM instance — it manages the connection pool
// and is the entry point for all database operations.
//
// We pass all models here so Sequelize knows about them.
// This is where associations between models are also registered.

const sequelize = new Sequelize(process.env.DATABASE_URL as string, {
  dialect: "postgres",
  models: [User, Post],

  // Log every SQL query to the console (disable in production)
  logging: process.env.NODE_ENV === "development"
    ? (sql: string) => console.log(`\x1b[35m[SQL]\x1b[0m ${sql}`)
    : false,

  pool: {
    max: 5,     // maximum connections in pool
    min: 0,     // minimum idle connections
    acquire: 30000, // ms to wait before throwing "unable to acquire connection"
    idle: 10000,    // ms a connection can be idle before being released
  },
});

export default sequelize;
