import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { api } from '../lib/apiClient';
import type { LikeResult, Page, Post, Visibility } from '../lib/types';
import { queryKeys } from './keys';

const PAGE_SIZE = 10;

export function useFeed(search: string) {
  const term = search.trim();
  return useInfiniteQuery({
    queryKey: [...queryKeys.feed, term],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<Page<Post>>('/posts', {
        params: {
          limit: PAGE_SIZE,
          ...(term ? { q: term } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      return data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

type FeedData = InfiniteData<Page<Post>, string | undefined>;

function patchPostInFeed(data: FeedData | undefined, postId: string, patch: (p: Post) => Post): FeedData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((p) => (p.id === postId ? patch(p) : p)),
    })),
  };
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content: string; visibility: Visibility; image?: File | null }) => {
      const form = new FormData();
      form.append('content', input.content);
      form.append('visibility', input.visibility);
      if (input.image) form.append('image', input.image);
      const { data } = await api.post<Post>('/posts', form);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.feed }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; content: string; visibility: Visibility }) => {
      const { data } = await api.patch<Post>(`/posts/${input.id}`, {
        content: input.content,
        visibility: input.visibility,
      });
      return data;
    },
    onSuccess: (post) => {
      qc.setQueriesData<FeedData>({ queryKey: queryKeys.feed }, (data) =>
        patchPostInFeed(data, post.id, () => post),
      );
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/posts/${postId}`);
      return postId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.feed }),
  });
}

export function useTogglePostLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Pick<Post, 'id' | 'likedByMe'>) => {
      const { data } = post.likedByMe
        ? await api.delete<LikeResult>(`/posts/${post.id}/like`)
        : await api.post<LikeResult>(`/posts/${post.id}/like`);
      return { postId: post.id, result: data };
    },
    onMutate: async (post) => {
      await qc.cancelQueries({ queryKey: queryKeys.feed });
      const previous = qc.getQueriesData<FeedData>({ queryKey: queryKeys.feed });
      qc.setQueriesData<FeedData>({ queryKey: queryKeys.feed }, (data) =>
        patchPostInFeed(data, post.id, (p) => ({
          ...p,
          likedByMe: !p.likedByMe,
          likeCount: p.likeCount + (p.likedByMe ? -1 : 1),
        })),
      );
      return { previous };
    },
    onError: (_err, _post, ctx) => {
      ctx?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: ({ postId, result }) => {
      qc.setQueriesData<FeedData>({ queryKey: queryKeys.feed }, (data) =>
        patchPostInFeed(data, postId, (p) => ({ ...p, ...result })),
      );
    },
  });
}
