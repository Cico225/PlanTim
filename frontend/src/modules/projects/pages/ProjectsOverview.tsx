import { Routes, Route, Navigate, useLocation, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FiList, FiCheckSquare, FiCalendar, FiClock, FiGrid, FiArrowRight, FiFolder } from 'react-icons/fi';
import ProjectsList from '../components/ProjectsList';
import ProjectDetail from '../components/ProjectDetail';
import CreateProjectPage from '../components/CreateProjectPage';
import PersonalTasks from '../components/PersonalTasks';
import ProjectsCalendar from '../components/ProjectsCalendar';
import ProjectsTimeline from '../components/ProjectsTimeline';
import ProjectsTableView from '../components/ProjectsTableView';

export default function ProjectsOverview() {
  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      <div className="min-w-0 flex-1 overflow-auto overflow-x-hidden p-3 sm:p-6">
        <Routes>
          <Route index element={<ProjectsLandingPage />} />
          <Route path="project-management/*" element={<ProjectManagementSection />} />
          <Route path="task-management" element={<TasksManagementSection />} />

          <Route path="calendar" element={<Navigate to="/projects/project-management/calendar" replace />} />
          <Route path="timeline" element={<Navigate to="/projects/project-management/timeline" replace />} />
          <Route path="table" element={<Navigate to="/projects/project-management/table" replace />} />
          <Route path="new" element={<Navigate to="/projects/project-management/new" replace />} />
          <Route path="personal-tasks" element={<Navigate to="/projects/task-management" replace />} />
          <Route path=":projectId" element={<LegacyProjectRedirect />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function ProjectManagementSection() {
  const location = useLocation();

  // Check if current route should hide tabs (on detail/edit pages)
  const hideTabs = location.pathname.match(/^\/projects\/project-management\/\d+/) !== null &&
                   !location.pathname.includes('/projects/project-management/calendar') &&
                   !location.pathname.includes('/projects/project-management/timeline') &&
                   !location.pathname.includes('/projects/project-management/table');

  const tabs = [
    {
      path: '/projects/project-management',
      label: 'Svi projekti',
      icon: FiList,
    },
    {
      path: '/projects/project-management/calendar',
      label: 'Kalendar',
      icon: FiCalendar,
    },
    {
      path: '/projects/project-management/timeline',
      label: 'Timeline',
      icon: FiClock,
    },
    {
      path: '/projects/project-management/table',
      label: 'Tabela',
      icon: FiGrid,
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      {!hideTabs && (
        <div className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800">
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <div className="mb-3 sm:mb-4">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl md:text-3xl">
                Upravljanje projektima
              </h1>
              <p className="mt-1 hidden text-sm text-gray-600 dark:text-gray-400 sm:block sm:text-base">
                Projekti, rokovi i pregled aktivnosti tima na jednom mjestu
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
                  (tab.path !== '/projects/project-management' && location.pathname.startsWith(tab.path));

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
          <Route path=":projectId" element={<ProjectDetail />} />
          <Route path="calendar" element={<ProjectsCalendar />} />
          <Route path="timeline" element={<ProjectsTimeline />} />
          <Route path="table" element={<ProjectsTableView />} />
          <Route path="*" element={<Navigate to="/projects/project-management" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function TasksManagementSection() {
  return <PersonalTasks />;
}

function ProjectsLandingPage() {
  const { t } = useTranslation();

  const cards = [
    {
      title: 'Upravljanje projektima',
      description: 'Planiranje projekata, pregled detalja, kalendar, timeline i tabela aktivnosti.',
      href: '/projects/project-management',
      icon: FiFolder,
      color: 'indigo' as const,
      id: 'projects' as const,
    },
    {
      title: 'Upravljanje zadacima',
      description: 'Lični i dodijeljeni zadaci, brzi pregled obaveza i operativni rad tima.',
      href: '/projects/task-management',
      icon: FiCheckSquare,
      color: 'emerald' as const,
      id: 'tasks' as const,
    },
  ];

  const colorStyles = {
    indigo: {
      bg: 'bg-indigo-500/10',
      icon: 'text-indigo-600 dark:text-indigo-400',
      ring: 'group-hover:ring-indigo-200 dark:group-hover:ring-indigo-900/50',
      gradient: 'from-indigo-500/20 via-indigo-400/10 to-cyan-400/10',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-600 dark:text-emerald-400',
      ring: 'group-hover:ring-emerald-200 dark:group-hover:ring-emerald-900/50',
      gradient: 'from-emerald-500/20 via-teal-400/10 to-cyan-400/10',
    },
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-primary-50/40 to-indigo-50/50 p-6 shadow-sm dark:border-dark-700 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
              Modul
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              {t('projects.title')}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Odaberite radni tok: fokus na strateško vođenje projekata ili operativno upravljanje zadacima.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {cards.map((card, index) => {
          const styles = colorStyles[card.color];
          const Icon = card.icon;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
            >
              <Link
                to={card.href}
                className={`group card relative flex h-full flex-col overflow-hidden border border-transparent p-0 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 ${styles.ring}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-70`} />
                <ProjectsHubAnimation variant={card.id} className="relative mx-5 mt-5 h-44 rounded-3xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/5 dark:bg-dark-900/40" />

                <div className="relative flex flex-1 flex-col p-6 pt-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.bg}`}>
                      <Icon className={styles.icon} size={22} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{card.title}</h3>
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {card.id === 'projects' ? 'Planiranje i pregled' : 'Operativni rad'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {card.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-600 transition-transform group-hover:translate-x-1 dark:text-primary-400">
                    Otvori
                    <FiArrowRight size={16} />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectsHubAnimation({
  variant,
  className = '',
}: {
  variant: 'projects' | 'tasks';
  className?: string;
}) {
  if (variant === 'tasks') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect
            x="18"
            y="16"
            width="164"
            height="88"
            rx="24"
            fill="#ecfdf5"
            animate={{ opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {[
            { y: 28, delay: 0, width: 88, color: '#10b981', accent: '#34d399' },
            { y: 52, delay: 0.18, width: 72, color: '#0f766e', accent: '#2dd4bf' },
            { y: 76, delay: 0.36, width: 94, color: '#64748b', accent: '#94a3b8' },
          ].map((item, i) => (
            <motion.g
              key={i}
              animate={{ x: [0, 4, 0], y: [0, -3, 0] }}
              transition={{ duration: 2.3, delay: item.delay, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect x="28" y={item.y} width="144" height="16" rx="8" fill="white" />
              <circle cx="42" cy={item.y + 8} r="6" fill={item.color} />
              <motion.path
                d={`M39 ${item.y + 8} L41.5 ${item.y + 10.5} L46 ${item.y + 5.5}`}
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0.2, opacity: 0.5 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.3, delay: item.delay, repeat: Infinity, repeatType: 'reverse' }}
              />
              <rect x="56" y={item.y + 5} width={item.width} height="6" rx="3" fill={item.color} opacity="0.95" />
              <rect x={136 - i * 8} y={item.y + 5} width="20" height="6" rx="3" fill={item.accent} opacity="0.8" />
            </motion.g>
          ))}

          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={48 + i * 48}
              cy="100"
              r="4"
              fill="#10b981"
              animate={{ y: [0, -8, 0], opacity: [0.35, 0.9, 0.35] }}
              transition={{ duration: 1.8, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <motion.rect
          x="20"
          y="24"
          width="160"
          height="72"
          rx="20"
          fill="#e0e7ff"
          animate={{ y: [24, 20, 24] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        {[0, 1, 2, 3].map((i) => (
          <motion.rect
            key={i}
            x={34 + i * 36}
            y={i % 2 === 0 ? 36 : 52}
            width="22"
            height={i % 2 === 0 ? 36 : 22}
            rx="8"
            fill={i % 2 === 0 ? '#4f46e5' : '#818cf8'}
            animate={{ scaleY: [0.85, 1, 0.85], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${45 + i * 36}px 80px` }}
          />
        ))}
        <motion.path
          d="M28 92 L64 70 L94 76 L128 50 L172 58"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0.2, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

function LegacyProjectRedirect() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/projects/project-management/${projectId}`} replace />;
}
