import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiList, FiCheckSquare, FiCalendar, FiClock, FiGrid } from 'react-icons/fi';
import ProjectsList from '../components/ProjectsList';
import ProjectDetail from '../components/ProjectDetail';
import CreateProjectPage from '../components/CreateProjectPage';
import PersonalTasks from '../components/PersonalTasks';
import ProjectsCalendar from '../components/ProjectsCalendar';
import ProjectsTimeline from '../components/ProjectsTimeline';
import ProjectsTableView from '../components/ProjectsTableView';

export default function ProjectsOverview() {
  const { t } = useTranslation();
  const location = useLocation();

  // Check if current route should hide tabs (on detail/edit pages)
  const hideTabs = location.pathname.match(/^\/projects\/\d+/) !== null &&
                   !location.pathname.includes('/projects/personal-tasks') &&
                   !location.pathname.includes('/projects/calendar') &&
                   !location.pathname.includes('/projects/timeline') &&
                   !location.pathname.includes('/projects/table');

  const tabs = [
    {
      path: '/projects',
      label: 'Svi projekti',
      icon: FiList,
    },
    {
      path: '/projects/calendar',
      label: 'Kalendar',
      icon: FiCalendar,
    },
    {
      path: '/projects/timeline',
      label: 'Timeline',
      icon: FiClock,
    },
    {
      path: '/projects/table',
      label: 'Tabela',
      icon: FiGrid,
    },
    {
      path: '/projects/personal-tasks',
      label: 'Lični zadaci',
      icon: FiCheckSquare,
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      {!hideTabs && (
        <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800">
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <div className="mb-3 sm:mb-4">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl md:text-3xl">
                {t('projects.title') || 'Upravljanje Projektima'}
              </h1>
              <p className="mt-1 hidden text-sm text-gray-600 dark:text-gray-400 sm:block sm:text-base">
                Upravljanje projektima i zadacima
              </p>
            </div>

            <nav
              className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-0 sm:space-x-1 sm:overflow-x-auto sm:whitespace-nowrap sm:pb-2 sm:scrollbar-hide"
              aria-label="Projekti navigacija"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive =
                  location.pathname === tab.path ||
                  (tab.path !== '/projects' && location.pathname.startsWith(tab.path));

                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors touch-manipulation sm:flex-row sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:flex-shrink-0 ${
                      isActive
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-dark-700/50 dark:text-gray-400 dark:hover:bg-dark-700 sm:bg-transparent'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="leading-tight">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1 overflow-auto overflow-x-hidden p-3 sm:p-6">
        <Routes>
          <Route index element={<ProjectsList />} />
          <Route path="new" element={<CreateProjectPage />} />
          <Route path="personal-tasks" element={<PersonalTasks />} />
          <Route path=":projectId" element={<ProjectDetail />} />
          <Route path="calendar" element={<ProjectsCalendar />} />
          <Route path="timeline" element={<ProjectsTimeline />} />
          <Route path="table" element={<ProjectsTableView />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </div>
  );
}
