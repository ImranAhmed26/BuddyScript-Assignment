import { z } from 'zod';

export const createPostSchema = z.object({
  // Either content or an uploaded image is required (enforced in the service).
  content: z.string().trim().max(5000).optional().default(''),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
});

export const updatePostSchema = z
  .object({
    content: z.string().trim().max(5000).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  })
  .refine((v) => v.content !== undefined || v.visibility !== undefined, {
    message: 'Nothing to update',
  });

export const postIdParams = z.object({ id: z.string().cuid() });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
