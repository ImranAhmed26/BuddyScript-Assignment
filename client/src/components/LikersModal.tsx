import { useEffect } from 'react';
import type { AuthorSummary } from '../lib/types';
import { fullName } from '../lib/format';
import { Avatar } from './Avatar';

interface LikersModalProps {
  title: string;
  likers: AuthorSummary[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onClose: () => void;
}

/** Modal listing the users who liked a post, comment, or reply. */
export function LikersModal({
  title,
  likers,
  isLoading,
  hasMore,
  onLoadMore,
  onClose,
}: LikersModalProps) {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="bs-modal-backdrop" onClick={onClose}>
      <div className="bs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bs-modal-header">
          <h4 className="_comment_name_title" style={{ margin: 0 }}>
            {title}
          </h4>
          <button type="button" className="bs-inline-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="bs-modal-body">
          {isLoading && likers.length === 0 ? (
            <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
              <div className="bs-spinner" />
            </div>
          ) : likers.length === 0 ? (
            <p className="bs-muted" style={{ padding: '16px 20px', margin: 0 }}>
              No likes yet.
            </p>
          ) : (
            <>
              {likers.map((u) => (
                <div key={u.id} className="bs-liker-row">
                  <Avatar user={u} size={40} />
                  <span className="_comment_name_title">{fullName(u)}</span>
                </div>
              ))}
              {hasMore && (
                <div style={{ padding: '8px 20px' }}>
                  <button type="button" className="bs-inline-btn _time_link" onClick={onLoadMore}>
                    Show more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
