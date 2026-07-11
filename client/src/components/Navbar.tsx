import { useEffect, useState, type FormEvent } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { fullName } from '../lib/format';
import { Avatar } from './Avatar';

type Menu = 'notify' | 'profile' | null;

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setSearch = useUiStore((s) => s.setSearch);

  const [term, setTerm] = useState('');
  const [menu, setMenu] = useState<Menu>(null);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(term), 300);
    return () => clearTimeout(id);
  }, [term, setSearch]);

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearch(term);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10">
      <div className="container _custom_container">
        <div className="_logo_wrap">
          <a className="navbar-brand" href="/feed">
            <img src="/assets/images/logo.svg" alt="Buddy Script" className="_nav_logo" />
          </a>
        </div>

        <div className="collapse navbar-collapse show" id="navbarSupportedContent">
          <div className="_header_form ms-auto">
            <form className="_header_form_grp" onSubmit={onSearchSubmit}>
              <svg className="_header_form_svg" xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="none" viewBox="0 0 17 17">
                <circle cx="7" cy="7" r="6" stroke="#666" />
                <path stroke="#666" strokeLinecap="round" d="M16 16l-3-3" />
              </svg>
              <input
                className="form-control me-2 _inpt1"
                type="search"
                placeholder="Search posts"
                aria-label="Search posts"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </form>
          </div>

          <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list ms-auto _mar_r8">
            <li className="nav-item _header_nav_item">
              <a className="nav-link _header_nav_link_active _header_nav_link" aria-current="page" href="/feed">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="21" fill="none" viewBox="0 0 18 21">
                  <path className="_home_active" stroke="#000" strokeWidth="1.5" strokeOpacity=".6" d="M1 9.924c0-1.552 0-2.328.314-3.01.313-.682.902-1.187 2.08-2.196l1.143-.98C6.667 1.913 7.732 1 9 1c1.268 0 2.333.913 4.463 2.738l1.142.98c1.179 1.01 1.768 1.514 2.081 2.196.314.682.314 1.458.314 3.01v4.846c0 2.155 0 3.233-.67 3.902-.669.67-1.746.67-3.901.67H5.57c-2.155 0-3.232 0-3.902-.67C1 18.002 1 16.925 1 14.77V9.924z" />
                  <path className="_home_active" stroke="#000" strokeOpacity=".6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.857 19.341v-5.857a1 1 0 00-1-1H7.143a1 1 0 00-1 1v5.857" />
                </svg>
              </a>
            </li>
            <li className="nav-item _header_nav_item">
              <span className="nav-link _header_nav_link" title="Friend requests (coming soon)">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="20" fill="none" viewBox="0 0 26 20">
                  <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M12.79 12.15h.429c2.268.015 7.45.243 7.45 3.732 0 3.466-5.002 3.692-7.415 3.707h-.894c-2.268-.015-7.452-.243-7.452-3.727 0-3.47 5.184-3.697 7.452-3.711l.297-.001h.132zm0 1.75c-2.792 0-6.12.34-6.12 1.962 0 1.585 3.13 1.955 5.864 1.976l.255.002c2.792 0 6.118-.34 6.118-1.958 0-1.638-3.326-1.982-6.118-1.982zm9.343-2.224c2.846.424 3.444 1.751 3.444 2.79 0 .636-.251 1.794-1.931 2.43a.882.882 0 01-1.137-.506.873.873 0 01.51-1.13c.796-.3.796-.633.796-.793 0-.511-.654-.868-1.944-1.06a.878.878 0 01-.741-.996.886.886 0 011.003-.735zm-17.685.735a.878.878 0 01-.742.997c-1.29.19-1.944.548-1.944 1.059 0 .16 0 .491.798.793a.873.873 0 01-.314 1.693.897.897 0 01-.313-.057C.25 16.259 0 15.1 0 14.466c0-1.037.598-2.366 3.446-2.79.485-.06.929.257 1.002.735zM12.789 0c2.96 0 5.368 2.392 5.368 5.33 0 2.94-2.407 5.331-5.368 5.331h-.031a5.329 5.329 0 01-3.782-1.57 5.253 5.253 0 01-1.553-3.764C7.423 2.392 9.83 0 12.789 0zm0 1.75c-1.987 0-3.604 1.607-3.604 3.58a3.526 3.526 0 001.04 2.527 3.58 3.58 0 002.535 1.054l.03.875v-.875c1.987 0 3.605-1.605 3.605-3.58S14.777 1.75 12.789 1.75z" clipRule="evenodd" />
                </svg>
              </span>
            </li>
            <li className="nav-item _header_nav_item">
              <span className="nav-link _header_nav_link _header_notify_btn" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="bs-icon-btn"
                  aria-label="Notifications"
                  onClick={() => setMenu((m) => (m === 'notify' ? null : 'notify'))}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 20 22">
                    <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057zM9.527 0c4.58 0 7.657 3.543 7.657 6.85 0 1.702.436 2.424.899 3.19.457.754.976 1.612.976 3.233-.36 4.14-4.713 4.478-9.531 4.478-4.818 0-9.172-.337-9.528-4.413-.003-1.686.515-2.544.973-3.299l.161-.27c.398-.679.737-1.417.737-2.918C1.871 3.543 4.948 0 9.528 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className={`_notification_dropdown ${menu === 'notify' ? 'show' : ''}`} style={{ height: 'auto', maxHeight: 'min(70vh, 420px)' }}>
                  <div className="_notifications_content">
                    <h4 className="_notifications_content_title">Notifications</h4>
                  </div>
                  <p className="bs-muted" style={{ padding: '24px 4px', textAlign: 'center' }}>
                    You're all caught up — no new notifications.
                  </p>
                </div>
              </span>
            </li>
            <li className="nav-item _header_nav_item">
              <span className="nav-link _header_nav_link" title="Messages (coming soon)">
                <svg xmlns="http://www.w3.org/2000/svg" width="23" height="22" fill="none" viewBox="0 0 23 22">
                  <path fill="#000" fillOpacity=".6" fillRule="evenodd" d="M11.43 0c2.96 0 5.743 1.143 7.833 3.22 4.32 4.29 4.32 11.271 0 15.562C17.145 20.886 14.293 22 11.405 22c-1.575 0-3.16-.33-4.643-1.012-.437-.174-.847-.338-1.14-.338-.338.002-.793.158-1.232.308-.9.307-2.022.69-2.852-.131-.826-.822-.445-1.932-.138-2.826.152-.44.307-.895.307-1.239 0-.282-.137-.642-.347-1.161C-.57 11.46.322 6.47 3.596 3.22A11.04 11.04 0 0111.43 0zm0 1.535A9.5 9.5 0 004.69 4.307a9.463 9.463 0 00-1.91 10.686c.241.592.474 1.17.474 1.77 0 .598-.207 1.201-.39 1.733-.15.439-.378 1.1-.231 1.245.143.147.813-.085 1.255-.235.53-.18 1.133-.387 1.73-.391.597 0 1.161.225 1.758.463 3.655 1.679 7.98.915 10.796-1.881 3.716-3.693 3.716-9.7 0-13.391a9.5 9.5 0 00-6.74-2.77z" clipRule="evenodd" />
                </svg>
              </span>
            </li>
          </ul>

          <div className="_header_nav_profile" style={{ position: 'relative' }}>
            {user && (
              <>
                <div className="_header_nav_profile_image">
                  <Avatar user={user} size={40} />
                </div>
                <div className="_header_nav_dropdown">
                  <p className="_header_nav_para" style={{ margin: 0 }}>{fullName(user)}</p>
                  <button
                    type="button"
                    className="_header_nav_dropdown_btn"
                    aria-label="Account menu"
                    onClick={() => setMenu((m) => (m === 'profile' ? null : 'profile'))}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" fill="none" viewBox="0 0 10 6">
                      <path fill="#112032" d="M5 5l.354.354L5 5.707l-.354-.353L5 5zm4.354-3.646l-4 4-.708-.708 4-4 .708.708zm-4.708 4l-4-4 .708-.708 4 4-.708.708z" />
                    </svg>
                  </button>
                </div>

                <div className={`_nav_profile_dropdown ${menu === 'profile' ? 'show' : ''}`}>
                  <div className="_nav_profile_dropdown_info">
                    <div className="_nav_profile_dropdown_image">
                      <Avatar user={user} size={48} />
                    </div>
                    <div className="_nav_profile_dropdown_info_txt">
                      <h4 className="_nav_dropdown_title" style={{ margin: 0 }}>{fullName(user)}</h4>
                      <span className="bs-muted">{user.email}</span>
                    </div>
                  </div>
                  <hr />
                  <ul className="_nav_dropdown_list">
                    <li className="_nav_dropdown_list_item">
                      <button
                        type="button"
                        className="_nav_dropdown_link bs-inline-btn"
                        style={{ width: '100%' }}
                        onClick={() => void logout()}
                      >
                        <div className="_nav_drop_info">
                          <span style={{ marginRight: 10 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none" viewBox="0 0 19 19">
                              <path stroke="#377DFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.667 18H2.889A1.889 1.889 0 011 16.111V2.89A1.889 1.889 0 012.889 1h3.778M13.277 14.222L18 9.5l-4.723-4.722M18 9.5H6.667" />
                            </svg>
                          </span>
                          Log Out
                        </div>
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {menu && <div className="bs-dropdown-backdrop" onClick={() => setMenu(null)} />}
    </nav>
  );
}
