import {
  Table, Column, Model, DataType,
  BelongsTo, BelongsToMany, ForeignKey,
  AllowNull, Default,
} from "sequelize-typescript";
import { User } from "./User";
import { Tag } from "./Tag";
import { BookmarkTag } from "./BookmarkTag";

@Table({ tableName: "bookmarks", underscored: true })
export class Bookmark extends Model {
  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  url!: string;

  @Column(DataType.TEXT)
  notes!: string | null;

  @Default(false)
  @Column(DataType.BOOLEAN)
  favourite!: boolean;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId!: number;

  @BelongsTo(() => User)
  user!: User;

  // Many-to-many: a bookmark can have many tags
  @BelongsToMany(() => Tag, () => BookmarkTag)
  tags!: Tag[];
}
