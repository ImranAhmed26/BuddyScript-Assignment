// Zod request-validation schemas for the comments module.
import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(2000),
});

// Alias so create/update can diverge later without touching call sites.
export const updateCommentSchema = createCommentSchema;

export const commentIdParams = z.object({ id: z.string().cuid() });
export const postIdParams = z.object({ postId: z.string().cuid() });

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
