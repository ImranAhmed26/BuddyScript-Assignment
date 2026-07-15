import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import type { AuthorSummary, Comment, LikeResult, Page } from '../lib/types';
import { queryKeys } from './keys';

const PAGE_SIZE = 10;

type CommentData = InfiniteData<Page<Comment>, string | undefined>;

function buildCommentQuery(key: readonly unknown[], url: string) {
  return {
    queryKey: key,
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const { data } = await api.get<Page<Comment>>(url, {
        params: { limit: PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) },
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<Comment>) => last.nextCursor ?? undefined,
  };
}

export function useComments(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    ...buildCommentQuery(queryKeys.comments(postId), `/posts/${postId}/comments`),
    enabled,
  });
}

export function useReplies(commentId: string, enabled: boolean) {
  return useInfiniteQuery({
    ...buildCommentQuery(queryKeys.replies(commentId), `/comments/${commentId}/replies`),
    enabled,
  });
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<Comment>(`/posts/${postId}/comments`, { content });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      qc.invalidateQueries({ queryKey: queryKeys.feed }); // commentCount changed
    },
  });
}

export function useCreateReply(commentId: string, postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post<Comment>(`/comments/${commentId}/replies`, { content });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.replies(commentId) });
      qc.invalidateQueries({ queryKey: queryKeys.comments(postId) }); // parent replyCount
      qc.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

export function useUpdateComment(listKey: readonly unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; content: string }) => {
      const { data } = await api.patch<Comment>(`/comments/${input.id}`, { content: input.content });
      return data;
    },
    onSuccess: (comment) => {
      qc.setQueryData<CommentData>(listKey, (data) => patchComment(data, comment.id, () => comment));
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: Pick<Comment, 'id' | 'parentId'>) => {
      await api.delete(`/comments/${comment.id}`);
      return comment;
    },
    onSuccess: (comment) => {
      qc.invalidateQueries({ queryKey: queryKeys.comments(postId) });
      if (comment.parentId) qc.invalidateQueries({ queryKey: queryKeys.replies(comment.parentId) });
      qc.invalidateQueries({ queryKey: queryKeys.feed });
    },
  });
}

function patchComment(data: CommentData | undefined, id: string, patch: (c: Comment) => Comment) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((c) => (c.id === id ? patch(c) : c)),
    })),
  };
}

// mirrors useTogglePostLike but keyed off listKey since comments don't share one cache entry
export function useToggleCommentLike(listKey: readonly unknown[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (comment: Pick<Comment, 'id' | 'likedByMe'>) => {
      const { data } = comment.likedByMe
        ? await api.delete<LikeResult>(`/comments/${comment.id}/like`)
        : await api.post<LikeResult>(`/comments/${comment.id}/like`);
      return { id: comment.id, result: data };
    },
    onMutate: async (comment) => {
      await qc.cancelQueries({ queryKey: listKey }); // don't let a refetch stomp the optimistic write below
      const previous = qc.getQueryData<CommentData>(listKey);
      qc.setQueryData<CommentData>(listKey, (data) =>
        patchComment(data, comment.id, (c) => ({
          ...c,
          likedByMe: !c.likedByMe,
          likeCount: c.likeCount + (c.likedByMe ? -1 : 1),
        })),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      // roll back to the snapshot taken in onMutate
      if (ctx?.previous) qc.setQueryData(listKey, ctx.previous);
    },
    onSuccess: ({ id, result }) => {
      qc.setQueryData<CommentData>(listKey, (data) =>
        patchComment(data, id, (c) => ({ ...c, ...result })),
      );
    },
  });
}

// loaded lazily, only once the "liked by" modal is actually opened
export function usePostLikers(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.postLikers(postId),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<Page<AuthorSummary>>(`/posts/${postId}/likes`, {
        params: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) },
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export function useCommentLikers(commentId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.commentLikers(commentId),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<Page<AuthorSummary>>(`/comments/${commentId}/likes`, {
        params: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) },
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}
