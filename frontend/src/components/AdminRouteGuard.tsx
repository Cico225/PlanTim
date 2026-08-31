import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isAdminUser } from '@/utils/isAdmin';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
