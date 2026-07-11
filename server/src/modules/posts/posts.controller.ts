import type { Request, Response } from 'express';
import type { Pagination } from '../../lib/pagination.js';
import { uploadPublicPath } from '../../lib/upload.js';
import type { FeedQuery } from './posts.schemas.js';
import * as postsService from './posts.service.js';

export async function list(req: Request, res: Response): Promise<void> {
  const page = await postsService.listFeed(req.userId!, res.locals.query as FeedQuery);
  res.json(page);
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json(await postsService.getPost(req.userId!, req.params.id));
}

export async function create(req: Request, res: Response): Promise<void> {
  const imageUrl = req.file ? uploadPublicPath(req.file.filename) : null;
  const post = await postsService.createPost(req.userId!, {
    content: req.body.content,
    imageUrl,
    visibility: req.body.visibility,
  });
  res.status(201).json(post);
}

export async function update(req: Request, res: Response): Promise<void> {
  res.json(await postsService.updatePost(req.userId!, req.params.id, req.body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await postsService.deletePost(req.userId!, req.params.id);
  res.status(204).end();
}

export async function like(req: Request, res: Response): Promise<void> {
  const { likeCount } = await postsService.likePost(req.userId!, req.params.id);
  res.json({ likedByMe: true, likeCount });
}

export async function unlike(req: Request, res: Response): Promise<void> {
  const { likeCount } = await postsService.unlikePost(req.userId!, req.params.id);
  res.json({ likedByMe: false, likeCount });
}

export async function likers(req: Request, res: Response): Promise<void> {
  const page = await postsService.listPostLikers(
    req.userId!,
    req.params.id,
    res.locals.query as Pagination,
  );
  res.json(page);
}
