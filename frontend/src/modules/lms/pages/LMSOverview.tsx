import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiBook, FiSettings, FiAward, FiList, FiFileText, FiHelpCircle, FiTrendingUp, FiSearch, FiBarChart2, FiHome } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import CoursesList from '../components/CoursesList';
import CourseDetail from '../components/CourseDetail';
import LessonView from '../components/LessonView';
import QuizView from '../components/QuizView';
import CourseManager from '../components/CourseManager';
import MyCourses from '../components/MyCourses';
import Certificates from '../components/Certificates';
import CourseForm from '../components/CourseForm';
import LessonForm from '../components/LessonForm';
import QuizForm from '../components/QuizForm';
import LMSDashboard from '../components/LMSDashboard';
import Leaderboard from '../components/Leaderboard';
import BadgesPage from '../components/BadgesPage';
import LMSSearch from '../components/LMSSearch';
import LMSAdminReports from '../components/LMSAdminReports';

export default function LMSOverview() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuthStore();
  
  // Check if user has admin or manager role (case-insensitive)
  // Support both 'role' (string) and 'roles' (array) formats
  const userRoleString = user?.role?.toLowerCase() || '';
  const userRolesArray = (user as any)?.roles || [];
  const hasAdminRole = userRoleString === 'admin' || 
                      userRolesArray.some((r: string) => r?.toLowerCase() === 'admin');
  const hasManagerRole = userRoleString === 'manager' || 
                        userRolesArray.some((r: string) => r?.toLowerCase() === 'manager');
  const hasLmsPermission = user?.permissions?.some((p: string) => 
    p.includes('lms.manage') || 
    p.includes('lms.create') || 
    p.includes('lms.update') ||
    p === 'lms.manage' ||
    p === 'lms.create'
  );
  
  const isManager = hasAdminRole || hasManagerRole || hasLmsPermission;
  
  // Check if current route should hide tabs (only on specific detail/edit pages)
  // Hide tabs on: lesson view, quiz view, course form (new/edit)
  // Show tabs on: course list, my courses, certificates, course detail, course manager
  const hideTabs = (location.pathname.includes('/courses/') && 
                    (location.pathname.includes('/lessons/') || 
                     location.pathname.includes('/quizzes/'))) ||
                   (location.pathname.includes('/manage/') && 
                    (location.pathname.includes('/new') || location.pathname.includes('/edit')));

  const tabs = [
    {
      path: '/lms/dashboard',
      label: 'Dashboard',
      icon: FiHome,
    },
    {
      path: '/lms',
      label: 'Svi kursevi',
      icon: FiList,
      exact: true,
    },
    {
      path: '/lms/my-courses',
      label: 'Moji kursevi',
      icon: FiBook,
    },
    {
      path: '/lms/leaderboard',
      label: 'Ljestvica',
      icon: FiTrendingUp,
    },
    {
      path: '/lms/badges',
      label: 'Bedževi',
      icon: FiAward,
    },
    {
      path: '/lms/certificates',
      label: 'Certifikati',
      icon: FiFileText,
    },
    {
      path: '/lms/search',
      label: 'Pretraga',
      icon: FiSearch,
    },
    {
      path: '/lms/manage',
      label: 'Upravljanje',
      icon: FiSettings,
      requireManager: true,
    },
    {
      path: '/lms/reports',
      label: 'Izvještaji',
      icon: FiBarChart2,
      requireManager: true,
    },
  ];
  
  // Debug log removed - no longer needed

  // Ensure component always renders something
  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const visibleTabs = tabs.filter((tab) => !tab.requireManager || isManager);

  const shortLabels: Record<string, string> = {
    Dashboard: 'Početna',
    'Svi kursevi': 'Kursevi',
    'Moji kursevi': 'Moji',
    Ljestvica: 'Rang',
    Bedževi: 'Bedževi',
    Certifikati: 'Cert.',
    Pretraga: 'Traži',
    Upravljanje: 'Admin',
    Izvještaji: 'Izvještaji',
  };

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      {!hideTabs && (
        <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {/* Mobile Navigation */}
          <nav
            className="grid grid-cols-3 gap-1.5 p-2 sm:hidden"
            aria-label="LMS navigacija"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.exact
                ? location.pathname === tab.path
                : location.pathname.startsWith(tab.path);

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors touch-manipulation ${
                    isActive
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="leading-tight">{shortLabels[tab.label] || tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop Navigation - Horizontal tabs */}
          <div className="hidden sm:block w-full overflow-x-auto scrollbar-hide">
            <nav className="flex min-w-max px-4 md:px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.exact 
                  ? location.pathname === tab.path
                  : location.pathname.startsWith(tab.path);
                
                // Check if user has access to this tab
                const hasAccess = !tab.requireManager || isManager;
                
                // Hide tab if user doesn't have access
                if (tab.requireManager && !isManager) {
                  return null;
                }
                
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`
                      flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0
                      ${
                        isActive
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                      ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
      
      <div className="min-w-0 flex-1 overflow-auto overflow-x-hidden">
        <Routes>
          <Route index element={<CoursesList />} />
          <Route path="dashboard" element={<LMSDashboard />} />
          <Route path="my-courses" element={<MyCourses />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="badges" element={<BadgesPage />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="search" element={<LMSSearch />} />
          <Route path="reports" element={<LMSAdminReports />} />
          <Route path="manage" element={<CourseManager />} />
          <Route path="manage/new" element={<CourseForm />} />
          <Route path="manage/:courseId/edit" element={<CourseForm />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="courses/:courseId/lessons/new" element={<LessonForm />} />
          <Route path="courses/:courseId/lessons/:lessonId" element={<LessonView />} />
          <Route path="courses/:courseId/quizzes/new" element={<QuizForm />} />
          <Route path="courses/:courseId/quizzes/:quizId" element={<QuizView />} />
          <Route path="*" element={<Navigate to="/lms" replace />} />
        </Routes>
      </div>
    </div>
  );
}
