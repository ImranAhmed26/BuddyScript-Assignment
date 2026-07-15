import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// bounces already-logged-in users to /feed instead of showing login/register
export function GuestRoute() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <div className="bs-center-screen">
        <div className="bs-spinner" />
      </div>
    );
  }
  if (status === 'authenticated') return <Navigate to="/feed" replace />;
  return <Outlet />;
}
