import {
  Table, Column, Model, DataType,
  BelongsToMany, Unique, AllowNull,
} from "sequelize-typescript";
import { Bookmark } from "./Bookmark";
import { BookmarkTag } from "./BookmarkTag";

@Table({ tableName: "tags", underscored: true })
export class Tag extends Model {
  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  // Many-to-many: a tag can be on many bookmarks
  @BelongsToMany(() => Bookmark, () => BookmarkTag)
  bookmarks!: Bookmark[];
}
