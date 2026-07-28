import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiFolder,
  FiCheckSquare,
  FiActivity,
  FiFilter,
  FiX,
  FiUser,
  FiTag,
  FiCalendar,
  FiClock,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import { projectsService } from '@/services/projectsService';
import toast from 'react-hot-toast';

interface TimelineItem {
  type: 'project' | 'task' | 'activity';
  id: number;
  title: string;
  description?: string;
  date: string;
  user?: string;
  status?: string;
  priority?: string;
  color?: string;
  project_name?: string;
  project_id?: number;
  task_id?: number;
  entity_type?: string;
  entity_id?: number;
  action?: string;
}

export default function ProjectsTimeline() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    project_id?: number;
    user_id?: number;
    status?: string;
    task_status?: string;
    priority?: string;
    date_from?: string;
    date_to?: string;
  }>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadTimeline();
    loadProjects();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadProjects = async () => {
    try {
      const response = await projectsService.getProjects();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiService.get('/chat/users');
      const usersData = Array.isArray(response) ? response : (response?.data || []);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Try alternative endpoint
      try {
        const altResponse = await apiService.get('/admin/users');
        const altUsers = Array.isArray(altResponse?.data) ? altResponse.data : (Array.isArray(altResponse) ? altResponse : []);
        setUsers(altUsers);
      } catch (altError) {
        console.error('Failed to load users from alternative endpoint:', altError);
      }
    }
  };

  const loadTimeline = async () => {
    try {
      setLoading(true);
      
      const params: any = {};

      if (filters.project_id) {
        params.project_id = filters.project_id;
      }
      if (filters.user_id) {
        params.user_id = filters.user_id;
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.task_status) {
        params.task_status = filters.task_status;
      }
      if (filters.priority) {
        params.priority = filters.priority;
      }
      if (filters.date_from) {
        params.date_from = filters.date_from;
      }
      if (filters.date_to) {
        params.date_to = filters.date_to;
      }

      const data = await apiService.get('/projects/timeline', params);
      const timelineData = Array.isArray(data) ? data : (data?.data || []);
      
      // Filter to show only tasks
      const tasksOnly = timelineData.filter((item: TimelineItem) => item.type === 'task');
      
      setTimeline(tasksOnly);
    } catch (error: any) {
      console.error('Failed to load timeline:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri učitavanju timeline-a';
      toast.error(errorMessage);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FiFolder className="w-5 h-5" />;
      case 'task':
        return <FiCheckSquare className="w-5 h-5" />;
      case 'activity':
        return <FiActivity className="w-5 h-5" />;
      default:
        return <FiClock className="w-5 h-5" />;
    }
  };

  const getColorStyle = (color?: string) => {
    if (!color) return {};
    return {
      borderLeftColor: color,
      backgroundColor: `${color}20`,
      color: color,
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString('bs-BA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: date.toLocaleDateString('bs-BA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('bs-BA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const handleItemClick = (item: TimelineItem) => {
    if (item.type === 'project' && item.project_id) {
      navigate(`/projects/project-management/${item.project_id}`);
    } else if (item.type === 'task' && item.task_id && item.project_id) {
      navigate(`/projects/project-management/${item.project_id}?task=${item.task_id}`);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Boolean(
    filters.project_id || filters.user_id || filters.status || filters.task_status || filters.priority || filters.date_from || filters.date_to
  );

  if (loading && timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="card overflow-hidden p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Timeline Zadataka</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Kompaktniji pregled aktivnosti kako bi lista ostala pregledna i fokusirana na zadatke.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <FiX className="w-3.5 h-3.5" />
                Očisti
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FiFilter className="w-4 h-4" />
              Filteri
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-dark-900/20 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <FiFolder className="inline mr-1" size={14} />
                Projekt
              </label>
              <select
                value={filters.project_id || ''}
                onChange={(e) => setFilters({ ...filters, project_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Svi projekti</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <FiUser className="inline mr-1" size={14} />
                Osoba
              </label>
              <select
                value={filters.user_id || ''}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Sve osobe</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <FiTag className="inline mr-1" size={14} />
                Status Zadatka
              </label>
              <select
                value={filters.task_status || ''}
                onChange={(e) => setFilters({ ...filters, task_status: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Svi statusi</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <FiTag className="inline mr-1" size={14} />
                Prioritet
              </label>
              <select
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Svi prioriteti</option>
                <option value="urgent">Urgentno</option>
                <option value="high">Visok</option>
                <option value="medium">Srednji</option>
                <option value="low">Nizak</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <FiCalendar className="inline mr-1" size={14} />
                Od datuma
              </label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <FiCalendar className="inline mr-1" size={14} />
                Do datuma
              </label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-dark-700 dark:text-gray-200 dark:hover:bg-dark-600"
                >
                  <FiX className="w-4 h-4" />
                  Obriši filtere
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="card p-3 sm:p-6">
        {/* Legend */}
        <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-dark-900/20">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Legenda boja</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Prioritet zadataka</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#ef4444', backgroundColor: '#ef444420' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Urgentno</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#f59e0b', backgroundColor: '#f59e0b20' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Visok</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#3b82f6', backgroundColor: '#3b82f620' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Srednji</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#10b981', backgroundColor: '#10b98120' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Nizak</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2" style={{ borderColor: '#6b7280', backgroundColor: '#6b728020' }}></div>
              <span className="text-gray-600 dark:text-gray-400">Završeno</span>
            </div>
          </div>
        </div>

        {timeline.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nema zadataka za prikaz</p>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute bottom-0 left-[84px] top-0 w-0.5 bg-gray-200 dark:bg-gray-700 sm:left-[104px]"></div>
            
            <div className="space-y-6">
              {timeline.map((item, index) => {
                const dateInfo = formatDate(item.date);
                const colorStyle = getColorStyle(item.color);
                
                return (
                  <div key={`${item.type}-${item.id}-${index}`} className="relative flex items-start gap-3 sm:gap-4">
                    {/* Date - Left side above icon */}
                    <div className="relative z-10 w-20 flex-shrink-0 pt-1 sm:w-24">
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                        <div className="whitespace-nowrap">{dateInfo.date}</div>
                        <div className="whitespace-nowrap mt-0.5">{dateInfo.time}</div>
                      </div>
                    </div>
                    
                    {/* Icon */}
                    <div 
                      className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-2 bg-white dark:bg-gray-800 sm:h-16 sm:w-16"
                      style={{
                        borderColor: item.color || '#6366f1',
                        color: item.color || '#6366f1',
                      }}
                    >
                      {getIcon(item.type)}
                    </div>
                    
                    {/* Content */}
                    <div 
                      className={`flex-1 pb-6 cursor-pointer hover:opacity-80 transition-opacity ${item.type === 'project' || item.type === 'task' ? 'cursor-pointer' : ''}`}
                      onClick={() => handleItemClick({ ...item, task_id: item.task_id || item.id })}
                    >
                      <div 
                        className="rounded-lg p-4 border-l-4 bg-white dark:bg-gray-800"
                        style={colorStyle}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h3 className="font-medium text-gray-900 dark:text-white">{item.title}</h3>
                              {item.type === 'task' && item.project_name && (
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">
                                  {item.project_name}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                          {item.user && (
                            <div className="flex items-center gap-1">
                              <FiUser size={14} />
                              {item.user}
                            </div>
                          )}
                          {item.status && (
                            <div className="flex items-center gap-1">
                              <FiTag size={14} />
                              {item.status}
                            </div>
                          )}
                          {item.priority && item.type === 'task' && (
                            <div className="flex items-center gap-1">
                              Prioritet: {item.priority}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

