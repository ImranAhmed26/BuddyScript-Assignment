import { useRef, useState } from 'react';
import type { Post, Visibility } from '../lib/types';
import { fullName, timeAgo } from '../lib/format';
import { resolveUpload } from '../lib/config';
import { useDeletePost, useTogglePostLike, useUpdatePost } from '../api/posts';
import { usePostLikers } from '../api/comments';
import { useAuthStore } from '../store/authStore';
import { Avatar } from './Avatar';
import { LikersModal } from './LikersModal';
import { CommentThread } from './CommentThread';
import { REACTIONS, reactionEmoji, reactionLabel, type ReactionKey } from '../lib/reactions';
import { useHoverIntent } from '../lib/useHoverIntent';

// Static faces for the reaction pill — decorative, not tied to actual reactions used.
const REACTION_IMAGES = ['react_img1', 'react_img2', 'react_img3'];

/** A single feed post: header, content, reactions, comments, edit/delete/share. */
export function PostCard({ post }: { post: Post }) {
  const user = useAuthStore((s) => s.user);
  const toggleLike = useTogglePostLike();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();

  // Lets "Comment" actions scroll the comment section into view.
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const [showLikers, setShowLikers] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // "Hide" is local-only (no backend call); resets on reload.
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const picker = useHoverIntent();
  // Reaction type is client-side only — the API just stores a boolean like.
  const [reaction, setReaction] = useState<ReactionKey | null>(post.likedByMe ? 'like' : null);

  const pickReaction = (key: ReactionKey) => {
    picker.hide();
    setReaction(key);
    // Don't double-toggle the like mutation if already liked.
    if (!post.likedByMe) toggleLike.mutate(post);
  };

  const toggleDefaultLike = () => {
    // Optimistic local flip; mutation reconciles with the server.
    setReaction(post.likedByMe ? null : 'like');
    toggleLike.mutate(post);
  };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [draftVisibility, setDraftVisibility] = useState<Visibility>(post.visibility);

  const likers = usePostLikers(post.id, showLikers);
  const likerList = likers.data?.pages.flatMap((p) => p.items) ?? [];

  const isMine = user?.id === post.author.id;
  const imageSrc = resolveUpload(post.imageUrl);

  if (hidden) return null;

  const copyLink = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feed#post-${post.id}`);
      setCopied(true);
      // Revert "Link copied" back to "Share" after a couple seconds.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const beginEdit = () => {
    setDraft(post.content);
    setDraftVisibility(post.visibility);
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = async () => {
    await updatePost.mutateAsync({ id: post.id, content: draft.trim(), visibility: draftVisibility });
    setEditing(false);
  };

  return (
    // Anchor id lets copyLink's URL (`/feed#post-{id}`) jump to this card.
    <div id={`post-${post.id}`} className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
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

          <div className="_feed_inner_timeline_post_box_dropdown" style={{ position: 'relative' }}>
            <div className="_feed_timeline_post_dropdown">
              <button
                type="button"
                className="_feed_timeline_post_dropdown_link bs-icon-btn"
                aria-label="Post options"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17">
                  <circle cx="2" cy="2" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="8" r="2" fill="#C4C4C4" />
                  <circle cx="2" cy="15" r="2" fill="#C4C4C4" />
                </svg>
              </button>
            </div>
            <div className={`_feed_timeline_dropdown _timeline_dropdown ${menuOpen ? 'show' : ''}`} style={{ minWidth: 200 }}>
              <ul className="_feed_timeline_dropdown_list">
                <li className="_feed_timeline_dropdown_item">
                  <button type="button" className="_feed_timeline_dropdown_link bs-inline-btn" onClick={copyLink}>
                    Copy link
                  </button>
                </li>
                <li className="_feed_timeline_dropdown_item">
                  <button type="button" className="_feed_timeline_dropdown_link bs-inline-btn" onClick={() => { setHidden(true); setMenuOpen(false); }}>
                    Hide
                  </button>
                </li>
                {isMine && (
                  <>
                    <li className="_feed_timeline_dropdown_item">
                      <button type="button" className="_feed_timeline_dropdown_link bs-inline-btn" onClick={beginEdit}>
                        Edit Post
                      </button>
                    </li>
                    <li className="_feed_timeline_dropdown_item">
                      <button
                        type="button"
                        className="_feed_timeline_dropdown_link bs-inline-btn"
                        onClick={() => { setMenuOpen(false); deletePost.mutate(post.id); }}
                      >
                        Delete Post
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
            {menuOpen && <div className="bs-dropdown-backdrop" onClick={() => setMenuOpen(false)} />}
          </div>
        </div>

        {editing ? (
          <div style={{ marginTop: 8 }}>
            <textarea
              className="form-control"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              style={{ borderRadius: 10, resize: 'vertical' }}
            />
            <div className="bs-composer-actions">
              <label className="bs-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Visibility
                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={draftVisibility}
                  onChange={(e) => setDraftVisibility(e.target.value as Visibility)}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </label>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button type="button" className="bs-inline-btn bs-muted" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="_feed_inner_text_area_btn_link"
                  style={{ padding: '6px 20px' }}
                  disabled={updatePost.isPending || (!draft.trim() && !imageSrc)}
                  onClick={() => void saveEdit()}
                >
                  <span>{updatePost.isPending ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {post.content && <h4 className="_feed_inner_timeline_post_title">{post.content}</h4>}
            {imageSrc && (
              <div className="_feed_inner_timeline_image">
                <img src={imageSrc} alt="" className="_time_img" style={{ maxWidth: '100%' }} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
        <div className="_feed_inner_timeline_total_reacts_image">
          {post.likeCount > 0 ? (
            <button type="button" className="bs-reacts bs-inline-btn" onClick={() => setShowLikers(true)}>
              {REACTION_IMAGES.map((img, i) => (
                <img key={img} src={`/assets/images/${img}.png`} alt="" className={i === 0 ? '_react_img1' : '_react_img'} />
              ))}
              <span className="bs-reacts-count">{post.likeCount}</span>
            </button>
          ) : (
            <span className="bs-muted" style={{ fontSize: 13 }}>Be the first to like</span>
          )}
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          {/* Scrolls to the embedded comment thread. */}
          <button
            type="button"
            className="bs-inline-btn"
            style={{ fontSize: 14 }}
            onClick={() => commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          >
            <span>{post.commentCount}</span> Comment{post.commentCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction">
        <div
          className="bs-reaction-picker-wrap"
          style={{ flex: '1 1', display: 'flex' }}
          onMouseEnter={picker.show}
          onMouseLeave={picker.scheduleHide}
        >
          <button
            type="button"
            className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${post.likedByMe ? '_feed_reaction_active' : ''}`}
            style={{ margin: 0, width: '100%' }}
            onClick={toggleDefaultLike}
          >
            <span className="_feed_inner_timeline_reaction_link">
              <span className={post.likedByMe ? 'bs-reaction-active' : ''}>
                {reactionEmoji(post.likedByMe ? reaction : null)} {post.likedByMe ? reactionLabel(reaction) : 'Like'}
              </span>
            </span>
          </button>
          {picker.open && (
            <div className="bs-reaction-picker">
              {REACTIONS.map((r) => (
                <button key={r.key} type="button" title={r.label} onClick={() => pickReaction(r.key)}>
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="_feed_inner_timeline_reaction_comment _feed_reaction"
          onClick={() => commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          <span className="_feed_inner_timeline_reaction_link"><span>💬 Comment</span></span>
        </button>
        <button type="button" className="_feed_inner_timeline_reaction_share _feed_reaction" onClick={copyLink}>
          <span className="_feed_inner_timeline_reaction_link"><span>🔗 {copied ? 'Link copied' : 'Share'}</span></span>
        </button>
      </div>

      <div ref={commentSectionRef}>
        <CommentThread postId={post.id} />
      </div>

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
