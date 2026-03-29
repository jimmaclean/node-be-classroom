import { z } from "zod";

// Zod schemas define the shape and validation rules for your data.
// They serve double duty: runtime validation + TypeScript type inference.

// The schema for creating a new post
export const CreatePostSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be 100 characters or fewer")
    .trim(),

  body: z
    .string({ required_error: "Body is required" })
    .min(10, "Body must be at least 10 characters")
    .trim(),

  tags: z
    .array(z.string().min(1))
    .max(5, "Maximum 5 tags")
    .optional()
    .default([]),

  published: z.boolean().optional().default(false),
});

// The schema for updating an existing post — all fields optional
export const UpdatePostSchema = CreatePostSchema.partial();

// The schema for query parameters on GET /posts
export const PostQuerySchema = z.object({
  // Query strings are always strings — coerce to number
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  published: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

// Infer TypeScript types from the schemas — no duplication!
// This is the killer feature of Zod: one source of truth for types and validation.
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostQuery = z.infer<typeof PostQuerySchema>;
