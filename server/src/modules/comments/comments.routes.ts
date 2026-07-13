// Route definitions for comment/reply/like endpoints.
import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { paginationSchema } from '../../lib/pagination.js';
import {
  commentIdParams,
  createCommentSchema,
  postIdParams,
  updateCommentSchema,
} from './comments.schemas.js';
import * as commentsController from './comments.controller.js';

export const commentsRouter = Router();
commentsRouter.use(requireAuth);

commentsRouter.get(
  '/posts/:postId/comments',
  validate({ params: postIdParams, query: paginationSchema }),
  asyncHandler(commentsController.listForPost),
);
commentsRouter.post(
  '/posts/:postId/comments',
  validate({ params: postIdParams, body: createCommentSchema }),
  asyncHandler(commentsController.createForPost),
);

commentsRouter.get(
  '/comments/:id/replies',
  validate({ params: commentIdParams, query: paginationSchema }),
  asyncHandler(commentsController.listReplies),
);
commentsRouter.post(
  '/comments/:id/replies',
  validate({ params: commentIdParams, body: createCommentSchema }),
  asyncHandler(commentsController.createReply),
);

commentsRouter.patch(
  '/comments/:id',
  validate({ params: commentIdParams, body: updateCommentSchema }),
  asyncHandler(commentsController.update),
);
commentsRouter.delete(
  '/comments/:id',
  validate({ params: commentIdParams }),
  asyncHandler(commentsController.remove),
);

commentsRouter.post(
  '/comments/:id/like',
  validate({ params: commentIdParams }),
  asyncHandler(commentsController.like),
);
commentsRouter.delete(
  '/comments/:id/like',
  validate({ params: commentIdParams }),
  asyncHandler(commentsController.unlike),
);
commentsRouter.get(
  '/comments/:id/likes',
  validate({ params: commentIdParams, query: paginationSchema }),
  asyncHandler(commentsController.likers),
);
