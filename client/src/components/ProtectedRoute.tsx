import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** Route guard for authenticated-only pages; mirrors GuestRoute, sends unauthenticated users to /login. */
export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <div className="bs-center-screen">
        <div className="bs-spinner" />
      </div>
    );
  }
  if (status === 'unauthenticated') return <Navigate to="/login" replace />;
  return <Outlet />;
}
