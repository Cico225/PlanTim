import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            PlanTim
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enterprise Kolaboracijski Alat
          </p>
        </div>
        
        <div className="card p-8 animate-slide-up">
          <Outlet />
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>&copy; 2025 PlanTim. Sva prava zadržana.</p>
        </div>
      </div>
    </div>
  );
}


