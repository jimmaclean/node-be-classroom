import {
  Table, Column, Model, DataType,
  ForeignKey,
} from "sequelize-typescript";
import { Bookmark } from "./Bookmark";
import { Tag } from "./Tag";

// Junction table for the many-to-many relationship between Bookmark and Tag
// SQL: CREATE TABLE bookmark_tags (bookmark_id INT, tag_id INT, PRIMARY KEY (bookmark_id, tag_id))

@Table({ tableName: "bookmark_tags", underscored: true, timestamps: false })
export class BookmarkTag extends Model {
  @ForeignKey(() => Bookmark)
  @Column(DataType.INTEGER)
  bookmarkId!: number;

  @ForeignKey(() => Tag)
  @Column(DataType.INTEGER)
  tagId!: number;
}
