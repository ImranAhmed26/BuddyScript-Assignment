// Zod request-validation schemas for the posts module.
import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination.js';

/** Feed listing: cursor pagination plus an optional full-text search term. */
export const feedQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
});

export const createPostSchema = z.object({
  // content or image required — enforced in the service.
  content: z.string().trim().max(5000).optional().default(''),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
});

export const updatePostSchema = z
  .object({
    content: z.string().trim().max(5000).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  })
  // At least one field must be present — otherwise the PATCH is a no-op.
  .refine((v) => v.content !== undefined || v.visibility !== undefined, {
    message: 'Nothing to update',
  });

export const postIdParams = z.object({ id: z.string().cuid() });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
