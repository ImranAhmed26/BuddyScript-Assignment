// Comments are a 2-level tree; replyCount/commentCount are denormalized
// counters kept in sync via transactions to avoid extra COUNT queries.
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/http.js';
import { buildPage, type Page, type Pagination } from '../../lib/pagination.js';
import type { AuthorSummary } from '../../lib/serialize.js';

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: { author: { select: typeof authorSelect } };
}>;

export interface CommentDTO {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  author: AuthorSummary;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(c: CommentWithAuthor, likedByMe: boolean): CommentDTO {
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    content: c.content,
    likeCount: c.likeCount,
    replyCount: c.replyCount,
    likedByMe,
    author: c.author,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// One query to resolve viewer likes across a page, avoiding N+1 checks.
async function likedCommentIds(viewerId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.commentLike.findMany({
    where: { userId: viewerId, commentId: { in: ids } },
    select: { commentId: true },
  });
  return new Set(rows.map((r) => r.commentId));
}

/** Throws 404 unless the viewer may see the post this comment thread belongs to. */
async function assertPostVisible(viewerId: string, postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, visibility: true },
  });
  if (!post || (post.visibility === 'PRIVATE' && post.authorId !== viewerId)) {
    throw new ApiError(404, 'Post not found');
  }
}

// Shared cursor-pagination query for top-level comments and replies; `where`
// selects the tree level. Ordered by (createdAt, id) for a stable cursor.
async function listByParent(
  viewerId: string,
  where: Prisma.CommentWhereInput,
  { cursor, limit }: Pagination,
): Promise<Page<CommentDTO>> {
  const rows = await prisma.comment.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { author: { select: authorSelect } },
  });
  const page = buildPage(rows, limit);
  const liked = await likedCommentIds(viewerId, page.items.map((c) => c.id));
  return { items: page.items.map((c) => serialize(c, liked.has(c.id))), nextCursor: page.nextCursor };
}

export async function listComments(
  viewerId: string,
  postId: string,
  pagination: Pagination,
): Promise<Page<CommentDTO>> {
  await assertPostVisible(viewerId, postId);
  return listByParent(viewerId, { postId, parentId: null }, pagination);
}

// Visibility is checked via the comment's parent post, not the comment itself.
export async function listReplies(
  viewerId: string,
  parentId: string,
  pagination: Pagination,
): Promise<Page<CommentDTO>> {
  const parent = await prisma.comment.findUnique({
    where: { id: parentId },
    select: { postId: true },
  });
  if (!parent) throw new ApiError(404, 'Comment not found');
  await assertPostVisible(viewerId, parent.postId);
  return listByParent(viewerId, { parentId }, pagination);
}

// Transactional: touches both the comment table and the post's commentCount.
export async function createComment(
  authorId: string,
  postId: string,
  content: string,
): Promise<CommentDTO> {
  await assertPostVisible(authorId, postId);
  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId, authorId, content, parentId: null },
      include: { author: { select: authorSelect } },
    });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    return created;
  });
  return serialize(comment, false);
}

// Bumps both the post's commentCount and the parent's replyCount in one transaction.
export async function createReply(
  authorId: string,
  parentId: string,
  content: string,
): Promise<CommentDTO> {
  const parent = await prisma.comment.findUnique({
    where: { id: parentId },
    select: { id: true, postId: true, parentId: true },
  });
  if (!parent) throw new ApiError(404, 'Comment not found');
  // Max depth 2: you may reply to a comment, not to a reply.
  if (parent.parentId !== null) {
    throw new ApiError(400, 'Replies can only be added to top-level comments');
  }
  await assertPostVisible(authorId, parent.postId);

  const reply = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId: parent.postId, authorId, content, parentId },
      include: { author: { select: authorSelect } },
    });
    await tx.post.update({ where: { id: parent.postId }, data: { commentCount: { increment: 1 } } });
    await tx.comment.update({ where: { id: parentId }, data: { replyCount: { increment: 1 } } });
    return created;
  });
  return serialize(reply, false);
}

// Used by update/delete to enforce "you can only edit/remove your own comments".
async function loadOwnedComment(userId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (comment.authorId !== userId) throw new ApiError(403, 'You can only modify your own comments');
  return comment;
}

export async function updateComment(
  userId: string,
  commentId: string,
  content: string,
): Promise<CommentDTO> {
  await loadOwnedComment(userId, commentId);
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: { author: { select: authorSelect } },
  });
  const liked = await likedCommentIds(userId, [comment.id]);
  return serialize(comment, liked.has(comment.id));
}

// Replies cascade at the DB level; decrement commentCount by the whole subtree.
export async function deleteComment(userId: string, commentId: string): Promise<void> {
  const comment = await loadOwnedComment(userId, commentId);
  await prisma.$transaction(async (tx) => {
    if (comment.parentId === null) {
      const replies = await tx.comment.count({ where: { parentId: comment.id } });
      await tx.comment.delete({ where: { id: comment.id } });
      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 + replies } },
      });
    } else {
      await tx.comment.delete({ where: { id: comment.id } });
      await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } });
      await tx.comment.update({ where: { id: comment.parentId }, data: { replyCount: { decrement: 1 } } });
    }
  });
}

async function assertCommentVisible(viewerId: string, commentId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { postId: true },
  });
  if (!comment) throw new ApiError(404, 'Comment not found');
  await assertPostVisible(viewerId, comment.postId);
}

// Swallows Prisma's P2002 (duplicate like) to make the endpoint idempotent.
export async function likeComment(userId: string, commentId: string): Promise<{ likeCount: number }> {
  await assertCommentVisible(userId, commentId);
  try {
    await prisma.$transaction([
      prisma.commentLike.create({ data: { userId, commentId } }),
      prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
  }
  const c = await prisma.comment.findUniqueOrThrow({ where: { id: commentId }, select: { likeCount: true } });
  return { likeCount: c.likeCount };
}

// Only decrement when deleteMany actually removed a row, to avoid going negative.
export async function unlikeComment(userId: string, commentId: string): Promise<{ likeCount: number }> {
  await assertCommentVisible(userId, commentId);
  await prisma.$transaction(async (tx) => {
    const removed = await tx.commentLike.deleteMany({ where: { userId, commentId } });
    if (removed.count > 0) {
      await tx.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: removed.count } } });
    }
  });
  const c = await prisma.comment.findUniqueOrThrow({ where: { id: commentId }, select: { likeCount: true } });
  return { likeCount: c.likeCount };
}

export async function listCommentLikers(
  viewerId: string,
  commentId: string,
  { cursor, limit }: Pagination,
): Promise<Page<AuthorSummary>> {
  await assertCommentVisible(viewerId, commentId);
  const rows = await prisma.commentLike.findMany({
    where: { commentId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: authorSelect } },
  });
  const page = buildPage(rows, limit);
  return { items: page.items.map((r) => r.user), nextCursor: page.nextCursor };
}
