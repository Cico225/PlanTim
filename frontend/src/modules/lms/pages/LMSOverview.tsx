import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
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
import LMSMaloprodajaLandingPage, { useIsLmsAdmin } from './LMSMaloprodajaLandingPage';
import { LMS_RETAIL_BASE } from '../lmsPaths';

function LmsAdminOnly({ children }: { children: React.ReactNode }) {
  const isAdmin = useIsLmsAdmin();
  if (!isAdmin) {
    return <Navigate to={LMS_RETAIL_BASE} replace />;
  }
  return <>{children}</>;
}

export default function LMSOverview() {
  const location = useLocation();
  const { user } = useAuthStore();

  const isLanding =
    location.pathname === LMS_RETAIL_BASE ||
    location.pathname === `${LMS_RETAIL_BASE}/`;

  const hideChrome =
    (location.pathname.includes('/courses/') &&
      (location.pathname.includes('/lessons/') || location.pathname.includes('/quizzes/'))) ||
    (location.pathname.includes('/manage/') &&
      (location.pathname.includes('/new') || location.pathname.includes('/edit')));

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      {!isLanding && !hideChrome && (
        <div className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-emerald-100/80 bg-white/90 px-3 py-2.5 backdrop-blur-xl dark:border-emerald-900/30 dark:bg-dark-900/90 sm:px-5">
          <Link
            to={LMS_RETAIL_BASE}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-dark-700 dark:hover:text-gray-200"
          >
            <FiArrowLeft size={14} />
            Put učenja
          </Link>
          <span className="text-gray-300 dark:text-dark-600">/</span>
          <Link
            to="/lms"
            className="text-xs text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
          >
            Sistem za učenje
          </Link>
        </div>
      )}

      <div className="min-w-0 flex-1 overflow-auto overflow-x-hidden p-4 sm:p-6">
        <Routes>
          <Route index element={<LMSMaloprodajaLandingPage />} />
          <Route path="katalog" element={<CoursesList />} />
          <Route path="dashboard" element={<LMSDashboard />} />
          <Route path="my-courses" element={<MyCourses />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="badges" element={<BadgesPage />} />
          <Route path="certificates" element={<Certificates />} />
          <Route path="search" element={<LMSSearch />} />
          <Route
            path="reports"
            element={
              <LmsAdminOnly>
                <LMSAdminReports />
              </LmsAdminOnly>
            }
          />
          <Route
            path="manage"
            element={
              <LmsAdminOnly>
                <CourseManager />
              </LmsAdminOnly>
            }
          />
          <Route
            path="manage/new"
            element={
              <LmsAdminOnly>
                <CourseForm />
              </LmsAdminOnly>
            }
          />
          <Route
            path="manage/:courseId/edit"
            element={
              <LmsAdminOnly>
                <CourseForm />
              </LmsAdminOnly>
            }
          />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route
            path="courses/:courseId/lessons/new"
            element={
              <LmsAdminOnly>
                <LessonForm />
              </LmsAdminOnly>
            }
          />
          <Route path="courses/:courseId/lessons/:lessonId" element={<LessonView />} />
          <Route
            path="courses/:courseId/quizzes/new"
            element={
              <LmsAdminOnly>
                <QuizForm />
              </LmsAdminOnly>
            }
          />
          <Route path="courses/:courseId/quizzes/:quizId" element={<QuizView />} />
          <Route path="*" element={<Navigate to={LMS_RETAIL_BASE} replace />} />
        </Routes>
      </div>
    </div>
  );
}
