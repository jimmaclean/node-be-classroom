import {
  Table,
  Column,
  Model,
  DataType,
  BelongsTo,
  ForeignKey,
  AllowNull,
  Default,
} from "sequelize-typescript";
import { User } from "./User";

@Table({ tableName: "posts", underscored: true })
export class Post extends Model {
  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  @AllowNull(false)
  @Column(DataType.TEXT) // TEXT = unlimited length, STRING = VARCHAR(255)
  body!: string;

  // ARRAY type — PostgreSQL-specific feature for storing arrays natively
  // In other DBs (MySQL, SQLite) you'd store as JSON or a junction table
  @Default([])
  @Column(DataType.ARRAY(DataType.STRING))
  tags!: string[];

  @Default(false)
  @Column(DataType.BOOLEAN)
  published!: boolean;

  // ForeignKey creates the userId column that references users.id
  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId!: number;

  // BelongsTo is the inverse of HasMany
  // Enables: post.getUser(), post.user (with include)
  @BelongsTo(() => User)
  user!: User;
}
