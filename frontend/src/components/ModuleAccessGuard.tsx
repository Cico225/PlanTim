import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUserModules } from '@/hooks/useUserModules';
import { FiRefreshCw } from 'react-icons/fi';

interface ModuleAccessGuardProps {
  moduleName: string;
  children: ReactNode;
  fallbackTo?: string;
}

function isAdminUser(user: ReturnType<typeof useAuthStore.getState>['user']): boolean {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  if (role === 'admin' || role === 'super-admin') return true;
  const roles = (user as { roles?: string[] }).roles;
  return roles?.some((r) => {
    const lower = r?.toLowerCase();
    return lower === 'admin' || lower === 'super-admin' || lower === 'super admin';
  }) ?? false;
}

export default function ModuleAccessGuard({
  moduleName,
  children,
  fallbackTo = '/dashboard',
}: ModuleAccessGuardProps) {
  const { user } = useAuthStore();
  const { modules, loading } = useUserModules();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500">
        <FiRefreshCw className="mr-2 animate-spin" size={20} />
        Učitavanje…
      </div>
    );
  }

  if (isAdminUser(user) || modules.some((m) => m.name === moduleName)) {
    return <>{children}</>;
  }

  return <Navigate to={fallbackTo} replace />;
}
