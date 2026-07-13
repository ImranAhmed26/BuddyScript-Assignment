import { useState, type FormEvent } from 'react';
import type { Comment } from '../lib/types';
import { fullName, timeAgo } from '../lib/format';
import { queryKeys } from '../api/keys';
import {
  useComments,
  useReplies,
  useCreateComment,
  useCreateReply,
  useDeleteComment,
  useUpdateComment,
  useToggleCommentLike,
  useCommentLikers,
} from '../api/comments';
import { useAuthStore } from '../store/authStore';
import { Avatar } from './Avatar';
import { LikersModal } from './LikersModal';
import { REACTIONS, type ReactionKey } from '../lib/reactions';
import { useHoverIntent } from '../lib/useHoverIntent';

// Renders comments/replies: reaction picker, inline edit/delete, lazy-loaded reply threads.

/** Outline thumbs-up icon (blue), shown in place of the filled emoji. */
function ThumbIcon({ filled }: { filled: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={filled ? '#377dff' : 'none'} stroke="#377dff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  );
}

/** Active reaction icon; specific reaction is client-side only and resets on reload. */
function ReactionIcon({ reaction }: { reaction: ReactionKey | null }) {
  if (!reaction || reaction === 'like') return <ThumbIcon filled={Boolean(reaction)} />;
  const emoji = REACTIONS.find((r) => r.key === reaction)?.emoji;
  return <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>;
}

/** Small avatar + textarea composer used for both comments and replies. */
function CommentComposer({
  onSubmit,
  isPending,
  placeholder,
}: {
  onSubmit: (text: string) => Promise<unknown> | void;
  isPending: boolean;
  placeholder?: string;
}) {
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');

  // Clear the textarea only after the mutation resolves, so a failed submit keeps the draft.
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setText('');
  };

  return (
    <div className="_feed_inner_comment_box">
      <form className="_feed_inner_comment_box_form" onSubmit={submit}>
        <div className="_feed_inner_comment_box_content">
          <div className="_feed_inner_comment_box_content_image">
            {user && <Avatar user={user} size={36} />}
          </div>
          <div className="_feed_inner_comment_box_content_txt" style={{ flex: 1 }}>
            <textarea
              className="form-control _comment_textarea"
              placeholder={placeholder ?? 'Write a comment'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
        <div className="_feed_inner_comment_box_icon">
          <button
            type="submit"
            className="_feed_inner_comment_box_icon_btn bs-clickable"
            disabled={isPending}
            style={{ fontWeight: 600, color: '#377dff' }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  listKey,
  isReply = false,
}: {
  comment: Comment;
  postId: string;
  listKey: readonly unknown[];
  isReply?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const toggleLike = useToggleCommentLike(listKey);
  const deleteComment = useDeleteComment(postId);
  const updateComment = useUpdateComment(listKey);
  const createReply = useCreateReply(comment.id, postId);

  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const picker = useHoverIntent();
  // Client-only reaction type, seeded from server's `likedByMe` boolean.
  const [reaction, setReaction] = useState<ReactionKey | null>(comment.likedByMe ? 'like' : null);

  const pickReaction = (key: ReactionKey) => {
    picker.hide();
    setReaction(key);
    // Only fire the like mutation if not already liked.
    if (!comment.likedByMe) toggleLike.mutate(comment);
  };

  const toggleDefaultLike = () => {
    // Optimistic local flip; mutation reconciles with the server.
    if (comment.likedByMe) {
      setReaction(null);
    } else {
      setReaction('like');
    }
    toggleLike.mutate(comment);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await updateComment.mutateAsync({ id: comment.id, content: trimmed });
    setEditing(false);
  };

  // Replies/likers are fetched lazily, gated on showReplies/showLikers.
  const replies = useReplies(comment.id, showReplies);
  const likers = useCommentLikers(comment.id, showLikers);

  const replyList = replies.data?.pages.flatMap((p) => p.items) ?? [];
  const likerList = likers.data?.pages.flatMap((p) => p.items) ?? [];
  const isMine = user?.id === comment.author.id;

  return (
    <div className="_comment_main">
      <div className="_comment_image">
        <Avatar user={comment.author} size={40} className="_comment_img1" />
      </div>
      <div className="_comment_area" style={{ flex: 1 }}>
        <div className="_comment_details" style={{ marginBottom: 6 }}>
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{fullName(comment.author)}</h4>
            </div>
          </div>
          {editing ? (
            <div style={{ marginTop: 4 }}>
              <textarea
                className="form-control"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                style={{ borderRadius: 8, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <button
                  type="button"
                  className="bs-inline-btn"
                  style={{ color: '#377dff', fontWeight: 600 }}
                  disabled={updateComment.isPending}
                  onClick={() => void saveEdit()}
                >
                  {updateComment.isPending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="bs-inline-btn bs-muted" onClick={() => { setEditing(false); setDraft(comment.content); }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="_comment_status">
              <p className="_comment_status_text">
                <span>{comment.content}</span>
              </p>
            </div>
          )}
        </div>

        {!editing && (
          <div className="bs-comment-meta">
            <div
              className="bs-reaction-picker-wrap"
              onMouseEnter={picker.show}
              onMouseLeave={picker.scheduleHide}
            >
              <button
                type="button"
                className={`bs-inline-btn bs-reaction-trigger ${comment.likedByMe ? 'bs-reaction-active' : ''}`}
                onClick={toggleDefaultLike}
              >
                <ReactionIcon reaction={comment.likedByMe ? reaction : null} />
                {comment.likeCount > 0 && comment.likeCount}
              </button>
              {picker.open && (
                <div className="bs-reaction-picker">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      title={r.label}
                      onClick={() => pickReaction(r.key)}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!isReply && (
              <button type="button" className="bs-inline-btn" onClick={() => setReplying((v) => !v)}>
                Reply
              </button>
            )}
            {isMine && (
              <button type="button" className="bs-inline-btn" onClick={() => { setDraft(comment.content); setEditing(true); }}>
                Edit
              </button>
            )}
            {isMine && (
              <button
                type="button"
                className="bs-inline-btn"
                onClick={() => deleteComment.mutate({ id: comment.id, parentId: comment.parentId })}
              >
                Delete
              </button>
            )}
            <span className="_time_link">{timeAgo(comment.createdAt)}</span>
            {comment.likeCount > 0 && (
              <button type="button" className="bs-like-pill bs-inline-btn" style={{ marginLeft: 'auto' }} onClick={() => setShowLikers(true)}>
                <ThumbIcon filled /> {comment.likeCount}
              </button>
            )}
          </div>
        )}

        {!isReply && comment.replyCount > 0 && (
          <button
            type="button"
            className="_previous_comment_txt bs-inline-btn"
            onClick={() => setShowReplies((v) => !v)}
          >
            {showReplies
              ? 'Hide replies'
              : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {showReplies &&
          replyList.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              listKey={queryKeys.replies(comment.id)}
              isReply
            />
          ))}

        {replying && (
          <CommentComposer
            isPending={createReply.isPending}
            placeholder="Write a reply"
            onSubmit={async (text) => {
              await createReply.mutateAsync(text);
              setReplying(false);
              setShowReplies(true);
            }}
          />
        )}

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
    </div>
  );
}

/** Comment section: composer + paginated list; replies load on demand per comment. */
export function CommentThread({ postId }: { postId: string }) {
  const comments = useComments(postId, true);
  const createComment = useCreateComment(postId);

  const list = comments.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <div className="_feed_inner_timeline_cooment_area">
        <CommentComposer
          isPending={createComment.isPending}
          onSubmit={(text) => createComment.mutateAsync(text)}
        />
      </div>
      <div className="_timline_comment_main">
        {comments.hasNextPage && (
          <div className="_previous_comment">
            <button
              type="button"
              className="_previous_comment_txt"
              onClick={() => comments.fetchNextPage()}
            >
              View previous comments
            </button>
          </div>
        )}
        {list.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            listKey={queryKeys.comments(postId)}
          />
        ))}
      </div>
    </>
  );
}
