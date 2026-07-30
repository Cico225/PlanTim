import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';

// Auth Pages
import Login from './modules/auth/pages/Login';
import Register from './modules/auth/pages/Register';
import TermsOfService from './modules/auth/pages/TermsOfService';
import PrivacyPolicy from './modules/auth/pages/PrivacyPolicy';
import ResetPassword from './modules/auth/pages/ResetPassword';

// Dashboard
import Dashboard from './modules/dashboard/pages/Dashboard';

// CRM
import CRMOverview from './modules/crm/pages/CRMOverview';

// Project Management
import ProjectsOverview from './modules/projects/pages/ProjectsOverview';

// DMS
import DMSOverview from './modules/dms/pages/DMSOverview';

// LMS
import LMSOverview from './modules/lms/pages/LMSOverview';
import LMSLandingPage from './modules/lms/pages/LMSLandingPage';
import LMSDirekcijaPage from './modules/lms/pages/LMSDirekcijaPage';
import LMSLegacyRedirect from './modules/lms/pages/LMSLegacyRedirect';

// HRM is now accessed through Planika module at /planika/hr
// import HRMOverview from './modules/hrm/pages/HRMOverview';

// Maloprodaja
import MaloprodajaOverview from './modules/maloprodaja/pages/MaloprodajaOverview';

// Inbox (Internal Messages)
import Inbox from './modules/inbox/pages/Inbox';

// Notifications
import Notifications from './modules/notifications/pages/Notifications';

// GDPR
import GDPROverview from './modules/gdpr/pages/GDPROverview';

// Office 365
import Office365Overview from './modules/office365/pages/Office365Overview';

// Planika
import PlanikaOverview from './modules/planika/pages/PlanikaOverview';
import PlanikaSubmodule from './modules/planika/pages/PlanikaSubmodule';
import FinanceModuleEntry from './modules/planika/finance/FinanceModuleEntry';
import ActiveContractsPage from './modules/planika/finance/ActiveContractsPage';
import RetailComplaintsModuleEntry from './modules/planika/maloprodaja/RetailComplaintsModuleEntry';
import HRModuleEntry from './modules/planika/hr/HRModuleEntry';

// User Guide
import UserGuide from './modules/guide/UserGuide';

// AI
import AIOverview from './modules/ai/pages/AIOverview';

// Meeting Rooms
import MeetingRoomsOverview from './modules/meeting-rooms/pages/MeetingRoomsOverview';

// Administration
import AdminOverview from './modules/admin/pages/AdminOverview';

// Hooks
import { useAutoLogout } from './hooks/useAutoLogout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { theme } = useThemeStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  
  // Enable auto logout if authenticated
  useAutoLogout();

  useEffect(() => {
    // Apply theme to html element
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'theme-black');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'black') {
      root.classList.add('dark', 'theme-black');
    }
  }, [theme]);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          {/* Public Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/crm/*" element={<CRMOverview />} />
            <Route path="/projects/*" element={<ProjectsOverview />} />
            <Route path="/dms/*" element={<DMSOverview />} />
            <Route path="/lms" element={<LMSLandingPage />} />
            <Route path="/lms/direkcija" element={<LMSDirekcijaPage />} />
            <Route path="/lms/maloprodaja/*" element={<LMSOverview />} />
            {/* Legacy LMS deep links → maloprodaja */}
            <Route path="/lms/dashboard" element={<LMSLegacyRedirect />} />
            <Route path="/lms/my-courses" element={<LMSLegacyRedirect />} />
            <Route path="/lms/leaderboard" element={<LMSLegacyRedirect />} />
            <Route path="/lms/badges" element={<LMSLegacyRedirect />} />
            <Route path="/lms/certificates" element={<LMSLegacyRedirect />} />
            <Route path="/lms/search" element={<LMSLegacyRedirect />} />
            <Route path="/lms/manage/*" element={<LMSLegacyRedirect />} />
            <Route path="/lms/reports" element={<LMSLegacyRedirect />} />
            <Route path="/lms/courses/*" element={<LMSLegacyRedirect />} />
            {/* HRM is now accessible through Planika module at /planika/hr */}
            <Route path="/hrm/*" element={<Navigate to="/planika/hr" replace />} />
            <Route path="/maloprodaja/*" element={<MaloprodajaOverview />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/inbox/compose" element={<Inbox />} />
            <Route path="/inbox/:messageId" element={<Inbox />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/gdpr/*" element={<GDPROverview />} />
            <Route path="/office365/*" element={<Office365Overview />} />
            <Route path="/planika" element={<PlanikaOverview />} />
            <Route path="/uputstvo" element={<UserGuide />} />
            <Route path="/planika/finance/krediti/*" element={<FinanceModuleEntry />} />
            <Route path="/planika/finance/ugovori" element={<ActiveContractsPage />} />
            <Route path="/planika/retail/reklamacije/*" element={<RetailComplaintsModuleEntry />} />
            <Route path="/planika/hr/:section" element={<HRModuleEntry />} />
            <Route path="/planika/:submoduleId" element={<PlanikaSubmodule />} />
            <Route path="/ai/*" element={<AIOverview />} />
            <Route path="/meeting-rooms/*" element={<MeetingRoomsOverview />} />
            <Route path="/admin/*" element={<AdminOverview />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'light' ? '#fff' : theme === 'dark' ? '#1e293b' : '#000',
            color: theme === 'light' ? '#0f172a' : '#fff',
            border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid #334155',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;


