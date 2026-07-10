export type Visibility = 'PUBLIC' | 'PRIVATE';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface AuthorSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  visibility: Visibility;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  author: AuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  author: AuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface LikeResult {
  likedByMe: boolean;
  likeCount: number;
}
