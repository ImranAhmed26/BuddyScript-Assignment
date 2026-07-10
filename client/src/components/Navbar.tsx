import { useAuthStore } from '../store/authStore';
import { fullName } from '../lib/format';
import { Avatar } from './Avatar';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10">
      <div className="container _custom_container">
        <div className="_logo_wrap">
          <a className="navbar-brand" href="/feed">
            <img src="/assets/images/logo.svg" alt="Buddy Script" className="_nav_logo" />
          </a>
        </div>

        <div className="_header_nav_profile" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <>
              <Avatar user={user} size={40} />
              <div className="_header_nav_dropdown">
                <p className="_header_nav_para" style={{ margin: 0 }}>
                  {fullName(user)}
                </p>
              </div>
              <button
                type="button"
                className="_social_login_form_btn_link _btn1"
                style={{ width: 'auto', padding: '8px 18px' }}
                onClick={() => void logout()}
              >
                Log Out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
