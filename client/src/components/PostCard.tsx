import { useState } from 'react';
import type { Post } from '../lib/types';
import { fullName, timeAgo } from '../lib/format';
import { resolveUpload } from '../lib/config';
import { useDeletePost, useTogglePostLike } from '../api/posts';
import { usePostLikers } from '../api/comments';
import { useAuthStore } from '../store/authStore';
import { Avatar } from './Avatar';
import { LikersModal } from './LikersModal';
import { CommentThread } from './CommentThread';

export function PostCard({ post }: { post: Post }) {
  const user = useAuthStore((s) => s.user);
  const toggleLike = useTogglePostLike();
  const deletePost = useDeletePost();

  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);

  const likers = usePostLikers(post.id, showLikers);
  const likerList = likers.data?.pages.flatMap((p) => p.items) ?? [];

  const isMine = user?.id === post.author.id;
  const imageSrc = resolveUpload(post.imageUrl);

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <Avatar user={post.author} size={45} className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{fullName(post.author)}</h4>
              <p className="_feed_inner_timeline_post_box_para">
                {timeAgo(post.createdAt)} · {post.visibility === 'PRIVATE' ? 'Private' : 'Public'}
              </p>
            </div>
          </div>
          {isMine && (
            <div className="_feed_inner_timeline_post_box_dropdown">
              <button
                type="button"
                className="bs-inline-btn bs-muted"
                onClick={() => deletePost.mutate(post.id)}
                title="Delete post"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {post.content && <h4 className="_feed_inner_timeline_post_title">{post.content}</h4>}

        {imageSrc && (
          <div className="_feed_inner_timeline_image">
            <img src={imageSrc} alt="" className="_time_img" style={{ maxWidth: '100%' }} />
          </div>
        )}
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image">
          {post.likeCount > 0 ? (
            <button type="button" className="bs-inline-btn" onClick={() => setShowLikers(true)}>
              <p className="_feed_inner_timeline_total_reacts_para">
                👍 {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
              </p>
            </button>
          ) : (
            <p className="_feed_inner_timeline_total_reacts_para bs-muted">Be the first to like</p>
          )}
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1">
            <button type="button" className="bs-inline-btn" onClick={() => setShowComments((v) => !v)}>
              <span>{post.commentCount}</span> Comment{post.commentCount === 1 ? '' : 's'}
            </button>
          </p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <button
          type="button"
          className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${post.likedByMe ? '_feed_reaction_active' : ''}`}
          onClick={() => toggleLike.mutate(post)}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span className={post.likedByMe ? 'bs-reaction-active' : ''}>👍 {post.likedByMe ? 'Liked' : 'Like'}</span>
          </span>
        </button>
        <button
          type="button"
          className="_feed_inner_timeline_reaction_comment _feed_reaction"
          onClick={() => setShowComments((v) => !v)}
        >
          <span className="_feed_inner_timeline_reaction_link">
            <span>💬 Comment</span>
          </span>
        </button>
      </div>

      {showComments && <CommentThread postId={post.id} />}

      {showLikers && (
        <LikersModal
          title="Liked by"
          likers={likerList}
          isLoading={likers.isLoading}
          hasMore={Boolean(likers.hasNextPage)}
          onLoadMore={() => likers.fetchNextPage()}
          onClose={() => setShowLikers(false)}
        />
      )}
    </div>
  );
}
