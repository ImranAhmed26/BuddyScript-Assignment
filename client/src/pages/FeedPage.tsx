import { useFeed } from '../api/posts';
import { getErrorMessage } from '../lib/apiClient';
import { useUiStore } from '../store/uiStore';
import { Navbar } from '../components/Navbar';
import { ThemeSwitch } from '../components/ThemeSwitch';
import { Stories } from '../components/Stories';
import { LeftSidebar } from '../components/LeftSidebar';
import { RightSidebar } from '../components/RightSidebar';
import { CreatePost } from '../components/CreatePost';
import { PostCard } from '../components/PostCard';

export default function FeedPage() {
  const search = useUiStore((s) => s.search);
  const theme = useUiStore((s) => s.theme);
  const feed = useFeed(search);
  const posts = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className={`_layout _layout_main_wrapper ${theme === 'dark' ? '_dark_wrapper' : ''}`}>
      <ThemeSwitch />
      <div className="_main_layout">
        <Navbar />

        <div className="container _custom_container">
          <div className="_layout_inner_wrap">
            <div className="row">
              {/* Left sidebar */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <LeftSidebar />
              </div>

              {/* Feed */}
              <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                <div className="_layout_middle_wrap">
                  <div className="_layout_middle_inner">
                    <Stories />
                    <CreatePost />

                    {search.trim() && (
                      <p className="bs-muted" style={{ padding: '4px 4px 12px' }}>
                        Showing results for “{search.trim()}”
                      </p>
                    )}

                    {feed.isLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                        <div className="bs-spinner" />
                      </div>
                    ) : feed.isError ? (
                      <p className="bs-error-text">
                        {getErrorMessage(feed.error, 'Could not load the feed')}
                      </p>
                    ) : posts.length === 0 ? (
                      <p className="bs-muted" style={{ textAlign: 'center', padding: 24 }}>
                        {search.trim()
                          ? 'No posts match your search.'
                          : 'No posts yet — be the first to share something.'}
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

              {/* Right sidebar */}
              <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                <RightSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
