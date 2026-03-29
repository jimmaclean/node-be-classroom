import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  CreatedAt,
  UpdatedAt,
  Unique,
  AllowNull,
} from "sequelize-typescript";
import { Post } from "./Post";

// @Table — maps this class to a database table
// underscored: true → camelCase properties become snake_case columns
//   e.g. createdAt → created_at in the database

@Table({ tableName: "users", underscored: true })
export class User extends Model {
  // id, createdAt, updatedAt are provided by Sequelize automatically
  // (Model base class adds them via the 'timestamps' option)

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  email!: string;

  // HasMany defines the association: one User has many Posts
  // Sequelize will look for a userId foreign key on the Post model
  @HasMany(() => Post)
  posts!: Post[];

  // Helper method — only expose safe fields to the API
  // Never return password hashes, internal IDs you want to hide, etc.
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
    };
  }
}
