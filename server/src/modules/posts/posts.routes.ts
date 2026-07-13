// Route definitions for /api/posts — feed, CRUD, and like endpoints.
import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { uploadImage } from '../../lib/upload.js';
import { paginationSchema } from '../../lib/pagination.js';
import { createPostSchema, feedQuerySchema, postIdParams, updatePostSchema } from './posts.schemas.js';
import * as postsController from './posts.controller.js';

export const postsRouter = Router();

postsRouter.use(requireAuth);

postsRouter.get('/', validate({ query: feedQuerySchema }), asyncHandler(postsController.list));

postsRouter.post(
  '/',
  uploadImage,
  validate({ body: createPostSchema }),
  asyncHandler(postsController.create),
);

postsRouter.get('/:id', validate({ params: postIdParams }), asyncHandler(postsController.get));

postsRouter.patch(
  '/:id',
  validate({ params: postIdParams, body: updatePostSchema }),
  asyncHandler(postsController.update),
);

postsRouter.delete('/:id', validate({ params: postIdParams }), asyncHandler(postsController.remove));

postsRouter.post('/:id/like', validate({ params: postIdParams }), asyncHandler(postsController.like));
postsRouter.delete('/:id/like', validate({ params: postIdParams }), asyncHandler(postsController.unlike));

postsRouter.get(
  '/:id/likes',
  validate({ params: postIdParams, query: paginationSchema }),
  asyncHandler(postsController.likers),
);
