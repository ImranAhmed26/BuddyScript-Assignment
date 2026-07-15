// likeCount/commentCount are denormalized counters, updated in transactions so reads avoid a COUNT.
import { Prisma, type Visibility } from '@prisma/client';
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

type PostWithAuthor = Prisma.PostGetPayload<{ include: { author: { select: typeof authorSelect } } }>;

export interface PostDTO {
  id: string;
  content: string;
  imageUrl: string | null;
  visibility: Visibility;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: AuthorSummary;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(post: PostWithAuthor, likedByMe: boolean): PostDTO {
  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    visibility: post.visibility,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    likedByMe,
    author: post.author,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

async function likedPostIds(viewerId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const rows = await prisma.postLike.findMany({
    where: { userId: viewerId, postId: { in: postIds } },
    select: { postId: true },
  });
  return new Set(rows.map((r) => r.postId));
}

const visibilityWhere = (viewerId: string): Prisma.PostWhereInput => ({
  OR: [{ visibility: 'PUBLIC' }, { authorId: viewerId }], // public posts, plus your own private ones
});

export async function listFeed(
  viewerId: string,
  { cursor, limit, q }: Pagination & { q?: string },
): Promise<Page<PostDTO>> {
  const where: Prisma.PostWhereInput = q
    ? { AND: [visibilityWhere(viewerId), { content: { contains: q, mode: 'insensitive' } }] }
    : visibilityWhere(viewerId);
  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // tiebreak on id so the cursor stays stable
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { author: { select: authorSelect } },
  });

  const page = buildPage(rows, limit);
  const liked = await likedPostIds(viewerId, page.items.map((p) => p.id));
  return { items: page.items.map((p) => serialize(p, liked.has(p.id))), nextCursor: page.nextCursor };
}

async function loadVisiblePost(viewerId: string, postId: string): Promise<PostWithAuthor> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: { select: authorSelect } },
  });
  if (!post || (post.visibility === 'PRIVATE' && post.authorId !== viewerId)) {
    throw new ApiError(404, 'Post not found');
  }
  return post;
}

export async function getPost(viewerId: string, postId: string): Promise<PostDTO> {
  const post = await loadVisiblePost(viewerId, postId);
  const liked = await likedPostIds(viewerId, [post.id]);
  return serialize(post, liked.has(post.id));
}

export async function createPost(
  authorId: string,
  data: { content: string; imageUrl: string | null; visibility: Visibility },
): Promise<PostDTO> {
  if (!data.content && !data.imageUrl) {
    // can't check this in the Zod schema since the image comes in as a separate multipart field
    throw new ApiError(400, 'A post must include text or an image');
  }
  const post = await prisma.post.create({
    data: { authorId, content: data.content, imageUrl: data.imageUrl, visibility: data.visibility },
    include: { author: { select: authorSelect } },
  });
  return serialize(post, false);
}

async function loadOwnedPost(userId: string, postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(404, 'Post not found');
  if (post.authorId !== userId) throw new ApiError(403, 'You can only modify your own posts');
  return post;
}

export async function updatePost(
  userId: string,
  postId: string,
  data: { content?: string; visibility?: Visibility },
): Promise<PostDTO> {
  await loadOwnedPost(userId, postId);
  const post = await prisma.post.update({
    where: { id: postId },
    data,
    include: { author: { select: authorSelect } },
  });
  const liked = await likedPostIds(userId, [post.id]);
  return serialize(post, liked.has(post.id));
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  await loadOwnedPost(userId, postId);
  await prisma.post.delete({ where: { id: postId } }); // cascades to comments + likes
}

export async function likePost(userId: string, postId: string): Promise<{ likeCount: number }> {
  await loadVisiblePost(userId, postId);
  try {
    await prisma.$transaction([
      prisma.postLike.create({ data: { userId, postId } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err; // P2002 = already liked, just ignore it
  }
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { likeCount: true } });
  return { likeCount: post.likeCount };
}

export async function unlikePost(userId: string, postId: string): Promise<{ likeCount: number }> {
  await loadVisiblePost(userId, postId);
  await prisma.$transaction(async (tx) => {
    const removed = await tx.postLike.deleteMany({ where: { userId, postId } });
    if (removed.count > 0) {
      // skip the decrement entirely if nothing was actually deleted
      await tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: removed.count } } });
    }
  });
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { likeCount: true } });
  return { likeCount: post.likeCount };
}

export async function listPostLikers(
  viewerId: string,
  postId: string,
  { cursor, limit }: Pagination,
): Promise<Page<AuthorSummary>> {
  await loadVisiblePost(viewerId, postId);
  const rows = await prisma.postLike.findMany({
    where: { postId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { user: { select: authorSelect } },
  });
  const page = buildPage(rows, limit);
  return { items: page.items.map((r) => r.user), nextCursor: page.nextCursor };
}
