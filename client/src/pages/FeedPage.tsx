import { useFeed } from '../api/posts';
import { getErrorMessage } from '../lib/apiClient';
import { Navbar } from '../components/Navbar';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';

export default function FeedPage() {
  const feed = useFeed();
  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="_layout _layout_main_wrapper">
      <div className="_main_layout">
        <Navbar />
        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row justify-content-center">
              <div className="col-xl-7 col-lg-9 col-md-12 col-sm-12">
                <div className="_layout_middle_wrap _mar_t30">
                  <CreatePost />

                  {feed.isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="bs-spinner" />
                    </div>
                  ) : feed.isError ? (
                    <p className="bs-error-text">{getErrorMessage(feed.error, 'Could not load the feed')}</p>
                  ) : posts.length === 0 ? (
                    <p className="bs-muted" style={{ textAlign: 'center', padding: 24 }}>
                      No posts yet — be the first to share something.
                    </p>
                  ) : (
                    <>
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}

                      {feed.hasNextPage && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                          <button
                            type="button"
                            className="_social_login_form_btn_link _btn1"
                            style={{ width: 'auto', padding: '10px 28px' }}
                            onClick={() => feed.fetchNextPage()}
                            disabled={feed.isFetchingNextPage}
                          >
                            {feed.isFetchingNextPage ? 'Loading…' : 'Load more'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
