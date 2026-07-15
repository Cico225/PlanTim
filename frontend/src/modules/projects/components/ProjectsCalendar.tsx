import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFolder,
  FiCheckSquare,
  FiFilter,
  FiX,
  FiUser,
  FiFlag,
  FiClock,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import { apiService } from '@/services/api';
import { projectsService } from '@/services/projectsService';
import toast from 'react-hot-toast';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'project' | 'task';
  start: string;
  end: string;
  color: string;
  project_id?: number;
  task_id?: number;
  status?: string;
  priority?: string;
  owner_name?: string;
  assigned_to_name?: string;
  assigned_to_id?: number;
  project_name?: string;
  description?: string;
}

// Boje usklađene s backendom (ProjectController::getProjectColor, getTaskColor)
const PROJECT_COLORS: Record<string, string> = {
  planning: '#6366f1',
  active: '#10b981',
  'on-hold': '#f59e0b',
  completed: '#6b7280',
  cancelled: '#ef4444',
};
const TASK_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
  done: '#6b7280',
  completed: '#6b7280',
};
const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Hitno',
  high: 'Visok',
  medium: 'Srednji',
  low: 'Nizak',
};
const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'U toku',
  review: 'Pregled',
  done: 'Završeno',
  planning: 'Planiranje',
  active: 'Aktivan',
  'on-hold': 'Na čekanju',
  completed: 'Završeno',
  cancelled: 'Otkazan',
};

export default function ProjectsCalendar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<{
    project_id?: number;
    user_id?: number;
    task_id?: number;
  }>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadCalendarData();
    loadProjects();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode, filters]);

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

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = getStartOfView(currentDate);
      const endDate = getEndOfView(currentDate);
      
      const params: any = {
        start_date: startDate,
        end_date: endDate,
      };

      if (filters.project_id) {
        params.project_id = filters.project_id;
      }
      if (filters.user_id) {
        params.user_id = filters.user_id;
      }
      if (filters.task_id) {
        params.task_id = filters.task_id;
      }

      const data = await projectsService.getCalendarData(params);
      setEvents(Array.isArray(data) ? data : (data?.data || []));
    } catch (error: any) {
      console.error('Failed to load calendar data:', error);
      toast.error(error.response?.data?.message || 'Greška pri učitavanju kalendara');
    } finally {
      setLoading(false);
    }
  };

  const getStartOfView = (date: Date): string => {
    if (viewMode === 'month') {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      return firstDay.toISOString().split('T')[0];
    } else {
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      return weekStart.toISOString().split('T')[0];
    }
  };

  const getEndOfView = (date: Date): string => {
    if (viewMode === 'month') {
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return lastDay.toISOString().split('T')[0];
    } else {
      const weekEnd = new Date(date);
      const day = weekEnd.getDay();
      const diff = weekEnd.getDate() - day + (day === 0 ? -6 : 1) + 6;
      weekEnd.setDate(diff);
      return weekEnd.toISOString().split('T')[0];
    }
  };

  const getDaysInView = (): Date[] => {
    const days: Date[] = [];
    
    if (viewMode === 'month') {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const startDate = new Date(firstDay);
      const dayOfWeek = startDate.getDay();
      const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate.setDate(diff);
      
      const endDate = new Date(lastDay);
      const endDayOfWeek = endDate.getDay();
      const endDiff = endDate.getDate() - endDayOfWeek + (endDayOfWeek === 0 ? 0 : 7);
      endDate.setDate(endDiff);
      
      const current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      const start = getStartOfView(currentDate);
      const end = getEndOfView(currentDate);
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      const current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventStart = event.start.split('T')[0];
      const eventEnd = event.end ? event.end.split('T')[0] : eventStart;
      return dateStr >= eventStart && dateStr <= eventEnd;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateHeader = (): string => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('bs-BA', { month: 'long', year: 'numeric' });
    } else {
      const start = getStartOfView(currentDate);
      const end = getEndOfView(currentDate);
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${startDate.toLocaleDateString('bs-BA')} - ${endDate.toLocaleDateString('bs-BA')}`;
    }
  };

  const getEventIcon = (type: string) => {
    return type === 'project' ? <FiFolder className="w-3 h-3" /> : <FiCheckSquare className="w-3 h-3" />;
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'project' && event.project_id) {
      navigate(`/projects/${event.project_id}`);
    } else if (event.type === 'task' && event.task_id && event.project_id) {
      navigate(`/projects/${event.project_id}?task=${event.task_id}`);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const daysInView = getDaysInView();
  const weekDays = ['Ponedeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const weekDayShort = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Calendar Controls */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 btn-secondary text-sm"
            >
              Danas
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
            <h2 className="ml-1 text-base font-semibold text-gray-900 dark:text-white sm:ml-4 sm:text-xl">
              {formatDateHeader()}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters || Object.keys(filters).some(k => filters[k as keyof typeof filters])
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <FiFilter className="w-4 h-4" />
              Filteri
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Sedmica
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Mjesec
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiUser className="inline mr-1" size={14} />
                  Korisnik
                </label>
                <select
                  value={filters.user_id || ''}
                  onChange={(e) => setFilters({ ...filters, user_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Svi korisnici</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                {(filters.project_id || filters.user_id || filters.task_id) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm btn-secondary flex items-center gap-2"
                  >
                    <FiX className="w-4 h-4" />
                    Obriši filtere
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legenda – boje usklađene s prikazom u kalendaru, simetrično poredane */}
      <div className="card p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legenda</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Object.entries(PROJECT_COLORS).map(([status, color]) => (
            <div key={`proj-${status}`} className="flex items-center gap-2 min-w-0">
              <div className="w-4 h-4 rounded shrink-0 flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                Projekt ({STATUS_LABELS[status] ?? status})
              </span>
            </div>
          ))}
          {(['urgent', 'high', 'medium', 'low', 'done'] as const).map((key) => (
            <div key={`task-${key}`} className="flex items-center gap-2 min-w-0">
              <div className="w-4 h-4 rounded shrink-0 flex-shrink-0" style={{ backgroundColor: TASK_COLORS[key] ?? '#3b82f6' }} />
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                Zadatak ({key === 'done' ? 'završeno' : PRIORITY_LABELS[key] ?? key})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden p-3 sm:p-6">
        {viewMode === 'month' ? (
          <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
            {/* Week day headers */}
            {weekDays.map((day, i) => (
              <div
                key={day}
                className="border-b border-gray-200 p-1 text-center text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300 sm:p-2 sm:text-sm"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{weekDayShort[i]}</span>
              </div>
            ))}

            {/* Calendar days */}
            {daysInView.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={index}
                  className={`min-h-[60px] rounded-lg border border-gray-200 p-1 dark:border-gray-700 sm:min-h-[120px] sm:p-2 ${
                    isToday ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : ''
                  } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                >
                  <div className={`mb-1 text-xs font-medium sm:mb-2 sm:text-sm ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="p-2 rounded text-xs cursor-pointer hover:shadow-md transition-all border-l-4"
                        style={{
                          borderLeftColor: event.color,
                          backgroundColor: `${event.color}20`,
                        }}
                        title={event.description || event.title}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {getEventIcon(event.type)}
                          <span className="font-medium truncate" style={{ color: event.color }}>
                            {event.title}
                          </span>
                        </div>
                        {event.type === 'project' && (
                          <>
                            {event.status && (
                              <div className="text-[10px] opacity-80 mb-0.5">
                                {STATUS_LABELS[event.status] ?? event.status}
                              </div>
                            )}
                            {event.owner_name && (
                              <div className="text-[10px] opacity-75 flex items-center gap-1">
                                <FiUser className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{event.owner_name}</span>
                              </div>
                            )}
                          </>
                        )}
                        {event.type === 'task' && (
                          <>
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              {event.status && (
                                <span className="text-[10px] opacity-90">
                                  {STATUS_LABELS[event.status] ?? event.status}
                                </span>
                              )}
                              {event.priority && (
                                <span className="flex items-center gap-0.5" title={event.priority}>
                                  <FiFlag className="w-2.5 h-2.5 shrink-0" style={{ color: event.color }} />
                                  <span className="text-[10px]">{PRIORITY_LABELS[event.priority] ?? event.priority}</span>
                                </span>
                              )}
                            </div>
                            {event.project_name && (
                              <div className="text-[10px] opacity-75 truncate mb-0.5" title={event.project_name}>
                                <FiFolder className="w-2.5 h-2.5 inline shrink-0 mr-0.5" />
                                {event.project_name}
                              </div>
                            )}
                            {(event.assigned_to_name || event.start) && (
                              <div className="flex items-center gap-1 text-[10px] opacity-75">
                                {event.assigned_to_name && (
                                  <span className="flex items-center gap-0.5 truncate">
                                    <FiUser className="w-2.5 h-2.5 shrink-0" />
                                    {event.assigned_to_name}
                                  </span>
                                )}
                                {event.start && (
                                  <span className="flex items-center gap-0.5 shrink-0">
                                    <FiClock className="w-2.5 h-2.5" />
                                    {format(new Date(event.start), 'dd.MM.', { locale: sr })}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="p-0.5 text-[10px] text-gray-500 dark:text-gray-400 sm:p-1 sm:text-xs">
                        +{dayEvents.length - 2} više
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-2">
            {daysInView.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`flex flex-col rounded-lg border-2 p-3 sm:min-h-[320px] sm:border sm:p-2 ${
                    isToday
                      ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30'
                  }`}
                >
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-600 sm:mb-2 sm:block sm:pb-2">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 sm:text-xs">
                      <span className="sm:hidden">{weekDays[index]}</span>
                      <span className="hidden sm:inline">{weekDayShort[index]}</span>
                    </div>
                    <div
                      className={`text-base font-semibold sm:text-lg ${
                        isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {day.getDate()}.{day.getMonth() + 1}.
                    </div>
                  </div>
                  <div className="space-y-2 sm:flex-1 sm:overflow-y-auto">
                    {dayEvents.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">Nema događaja</p>
                    ) : (
                      dayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className="p-3 rounded text-sm cursor-pointer hover:shadow-md transition-all border-l-4"
                          style={{
                            borderLeftColor: event.color,
                            backgroundColor: `${event.color}20`,
                          }}
                          title={event.description || event.title}
                        >
                          <div className="flex items-center gap-1 mb-1.5">
                            {getEventIcon(event.type)}
                            <span className="font-medium truncate" style={{ color: event.color }}>
                              {event.title}
                            </span>
                          </div>
                          {event.type === 'project' && (
                            <>
                              {event.status && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  {STATUS_LABELS[event.status] ?? event.status}
                                </div>
                              )}
                              {event.owner_name && (
                                <div className="text-xs opacity-80 flex items-center gap-1">
                                  <FiUser className="w-3 h-3 shrink-0" />
                                  {event.owner_name}
                                </div>
                              )}
                              {event.description && (
                                <p className="text-xs opacity-75 mt-1 line-clamp-2">{event.description}</p>
                              )}
                            </>
                          )}
                          {event.type === 'task' && (
                            <>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                {event.status && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                                    {STATUS_LABELS[event.status] ?? event.status}
                                  </span>
                                )}
                                {event.priority && (
                                  <span className="text-xs flex items-center gap-0.5" style={{ color: event.color }}>
                                    <FiFlag className="w-3 h-3 shrink-0" />
                                    {PRIORITY_LABELS[event.priority] ?? event.priority}
                                  </span>
                                )}
                              </div>
                              {event.project_name && (
                                <div className="text-xs opacity-80 flex items-center gap-1 mb-0.5">
                                  <FiFolder className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{event.project_name}</span>
                                </div>
                              )}
                              {event.assigned_to_name && (
                                <div className="text-xs opacity-80 flex items-center gap-1 mb-0.5">
                                  <FiUser className="w-3 h-3 shrink-0" />
                                  {event.assigned_to_name}
                                </div>
                              )}
                              {event.start && (
                                <div className="text-xs opacity-75 flex items-center gap-1">
                                  <FiClock className="w-3 h-3 shrink-0" />
                                  {format(new Date(event.start), 'dd.MM.yyyy', { locale: sr })}
                                  {event.end && event.end !== event.start && (
                                    <> – {format(new Date(event.end), 'dd.MM.yyyy', { locale: sr })}</>
                                  )}
                                </div>
                              )}
                              {event.description && (
                                <p className="text-xs opacity-75 mt-1 line-clamp-2">{event.description}</p>
                              )}
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

