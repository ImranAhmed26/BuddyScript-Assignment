export const queryKeys = {
  feed: ['feed'] as const,
  comments: (postId: string) => ['comments', postId] as const,
  replies: (commentId: string) => ['replies', commentId] as const,
  postLikers: (postId: string) => ['post-likers', postId] as const,
  commentLikers: (commentId: string) => ['comment-likers', commentId] as const,
};
