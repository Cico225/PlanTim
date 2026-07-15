import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiFolder, FiLayout, FiList, FiCheckSquare, FiFilter, FiTag, FiCalendar, FiClock, FiGrid } from 'react-icons/fi';
import ProjectsList from '../components/ProjectsList';
import ProjectDetail from '../components/ProjectDetail';
import CreateProjectPage from '../components/CreateProjectPage';
import KanbanBoard from '../components/KanbanBoard';
import PersonalTasks from '../components/PersonalTasks';
import ProjectsCalendar from '../components/ProjectsCalendar';
import ProjectsTimeline from '../components/ProjectsTimeline';
import ProjectsTableView from '../components/ProjectsTableView';
import AdvancedSearchModal from '../components/AdvancedSearchModal';
import { projectsService } from '@/services/projectsService';

export default function ProjectsOverview() {
  const { t } = useTranslation();
  const location = useLocation();

  // Check if current route should hide tabs (on detail/edit pages)
  const hideTabs = location.pathname.match(/^\/projects\/\d+/) !== null &&
                   !location.pathname.includes('/projects/personal-tasks') &&
                   !location.pathname.includes('/projects/board') &&
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
      path: '/projects/board',
      label: 'Kanban board',
      icon: FiLayout,
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
    // {
    //   path: '/projects/activity',
    //   label: 'Activity Log',
    //   icon: FiActivity,
    // },
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
                Upravljanje projektima, zadacima, Kanban i Gantt
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
          <Route path=":projectId/kanban" element={<ProjectDetail view="kanban" />} />
          <Route path="board" element={<ProjectsBoardView />} />
          <Route path="board/:projectId" element={<ProjectsBoardView />} />
          <Route path="calendar" element={<ProjectsCalendar />} />
          <Route path="timeline" element={<ProjectsTimeline />} />
          <Route path="table" element={<ProjectsTableView />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function ProjectsBoardView() {
  const location = useLocation();
  const projectIdFromPath = location.pathname.match(/\/projects\/board\/(\d+)/)?.[1];
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectIdFromPath ? parseInt(projectIdFromPath) : null
  );
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState<any>({
    status: '',
    priority: '',
    date_from: '',
    date_to: '',
    owner_id: '',
    user_ids: [] as number[],
    assignee_ids: [] as number[],
    task_status: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projectIdFromPath) {
      setSelectedProjectId(parseInt(projectIdFromPath));
    }
  }, [projectIdFromPath]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // Apply filters
      if (filters.status) params.status = filters.status;
      if (filters.owner_id) params.owner_id = parseInt(filters.owner_id);
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.user_ids && filters.user_ids.length > 0) params.user_ids = filters.user_ids;
      
      const response = await projectsService.getProjects(params);
      const filteredProjects = response.data || [];
      
      // Sort projects by created_at date (newest first)
      const sortedProjects = [...filteredProjects].sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      
      setProjects(sortedProjects);
      
      // Auto-select first project (newest) if none selected
      if (!selectedProjectId && sortedProjects.length > 0) {
        setSelectedProjectId(sortedProjects[0].id);
      } else if (selectedProjectId && !sortedProjects.find((p: any) => p.id === selectedProjectId)) {
        // If selected project is not in filtered list, select first one (newest) or clear selection
        if (sortedProjects.length > 0) {
          setSelectedProjectId(sortedProjects[0].id);
        } else {
          setSelectedProjectId(null);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleAdvancedSearch = (newFilters: any) => {
    setFilters(newFilters);
    setShowAdvancedSearch(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Nema projekata. Kreirajte prvi projekt da biste koristili Kanban board.
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <FiFolder className="mr-2" />
          Vrati se na projekte
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Filters and Project Selector */}
      <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-dark-800 sm:p-4">
        <div className="flex flex-col gap-4">
          {/* First Row: Project Selector and Quick Filters */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Project Selector */}
            <div className="flex-1 sm:flex-initial sm:w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Izaberi projekat:
              </label>
              <select
                value={selectedProjectId === null ? 'all' : selectedProjectId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedProjectId(value === 'all' ? null : parseInt(value));
                }}
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Svi projekti</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 sm:gap-3 flex-1">
              {/* Status Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiTag className="inline mr-1" size={14} />
                  Status projekta
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Svi statusi</option>
                  <option value="active">Aktivan</option>
                  <option value="completed">Završen</option>
                  <option value="on-hold">Na čekanju</option>
                  <option value="cancelled">Otkazan</option>
                </select>
              </div>

              {/* Date From Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiCalendar className="inline mr-1" size={14} />
                  Od datuma
                </label>
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Date To Filter */}
              <div className="flex-1 sm:flex-initial sm:w-48">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiCalendar className="inline mr-1" size={14} />
                  Do datuma
                </label>
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Advanced Search Button */}
              <div className="flex items-end">
                <button
                  onClick={() => setShowAdvancedSearch(true)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors flex items-center gap-2 h-[42px]"
                  title="Napredna pretraga"
                >
                  <FiFilter size={18} />
                  <span className="hidden sm:inline">Napredna</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.status || filters.owner_id || filters.date_from || filters.date_to || (filters.user_ids && filters.user_ids.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-dark-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Aktivni filteri:</span>
              {filters.status && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                  Status: {filters.status}
                  <button
                    onClick={() => setFilters({ ...filters, status: '' })}
                    className="hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.date_from && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                  Od: {filters.date_from}
                  <button
                    onClick={() => setFilters({ ...filters, date_from: '' })}
                    className="hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.date_to && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                  Do: {filters.date_to}
                  <button
                    onClick={() => setFilters({ ...filters, date_to: '' })}
                    className="hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    ×
                  </button>
                </span>
              )}
              {(filters.status || filters.date_from || filters.date_to || filters.owner_id || (filters.user_ids && filters.user_ids.length > 0)) && (
                <button
                  onClick={() => setFilters({ status: '', priority: '', date_from: '', date_to: '', owner_id: '', user_ids: [], assignee_ids: [], task_status: '' })}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
                >
                  Obriši sve
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        type="projects"
      />

      {/* Kanban Board */}
      <div className="overflow-auto">
        <KanbanBoard 
          projectId={selectedProjectId !== null ? selectedProjectId : 'all'}
          swimlane={filters.swimlane || undefined}
        />
      </div>
    </div>
  );
}


