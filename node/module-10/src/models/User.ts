import {
  Table, Column, Model, DataType,
  HasMany, AllowNull, Unique,
} from "sequelize-typescript";
import { Bookmark } from "./Bookmark";

@Table({ tableName: "users", underscored: true })
export class User extends Model {
  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  passwordHash!: string;

  @HasMany(() => Bookmark)
  bookmarks!: Bookmark[];

  toJSON() {
    return { id: this.id, name: this.name, email: this.email, createdAt: this.createdAt };
  }
}
