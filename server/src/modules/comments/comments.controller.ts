// HTTP layer for comments/replies/likes; req.userId is threaded through as viewer/actor.
import type { Request, Response } from 'express';
import type { Pagination } from '../../lib/pagination.js';
import * as commentsService from './comments.service.js';

export async function listForPost(req: Request, res: Response): Promise<void> {
  const page = await commentsService.listComments(
    req.userId!,
    req.params.postId,
    res.locals.query as Pagination,
  );
  res.json(page);
}

export async function createForPost(req: Request, res: Response): Promise<void> {
  const comment = await commentsService.createComment(req.userId!, req.params.postId, req.body.content);
  res.status(201).json(comment);
}

export async function listReplies(req: Request, res: Response): Promise<void> {
  const page = await commentsService.listReplies(
    req.userId!,
    req.params.id,
    res.locals.query as Pagination,
  );
  res.json(page);
}

// Nesting depth capped at 1 — see service.
export async function createReply(req: Request, res: Response): Promise<void> {
  const reply = await commentsService.createReply(req.userId!, req.params.id, req.body.content);
  res.status(201).json(reply);
}

export async function update(req: Request, res: Response): Promise<void> {
  res.json(await commentsService.updateComment(req.userId!, req.params.id, req.body.content));
}

// Deleting a top-level comment also removes its replies (see comments.service).
export async function remove(req: Request, res: Response): Promise<void> {
  await commentsService.deleteComment(req.userId!, req.params.id);
  res.status(204).end();
}

export async function like(req: Request, res: Response): Promise<void> {
  const { likeCount } = await commentsService.likeComment(req.userId!, req.params.id);
  res.json({ likedByMe: true, likeCount });
}

export async function unlike(req: Request, res: Response): Promise<void> {
  const { likeCount } = await commentsService.unlikeComment(req.userId!, req.params.id);
  res.json({ likedByMe: false, likeCount });
}

export async function likers(req: Request, res: Response): Promise<void> {
  const page = await commentsService.listCommentLikers(
    req.userId!,
    req.params.id,
    res.locals.query as Pagination,
  );
  res.json(page);
}
