import { useState, useEffect } from 'react';
import {
  FiCheckSquare,
  FiPlus,
  FiCalendar,
  FiFlag,
  FiUser,
  FiEdit,
  FiTrash2,
  FiFilter,
  FiList,
  FiGrid,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { projectsService, Task } from '@/services/projectsService';
import CreateTaskModal from './CreateTaskModal';
import PersonalTaskDetailModal from './PersonalTaskDetailModal';
import AdvancedSearchModal from './AdvancedSearchModal';
import toast from 'react-hot-toast';

export default function PersonalTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'all' | 'created-for-others' | 'assigned-to-me'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'table' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  useEffect(() => {
    // Debounce search to avoid too many requests
    const timeoutId = setTimeout(() => {
      fetchTasks();
    }, searchTerm ? 300 : 0); // 300ms delay for search, immediate for other filters

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedFilters, searchTerm, activeTab]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params: any = { ...advancedFilters };
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      // Add tab filter
      if (activeTab === 'created-for-others') {
        params.filter = 'created-for-others';
      } else if (activeTab === 'assigned-to-me') {
        params.filter = 'assigned-to-me';
      }
      const data = await projectsService.getPersonalTasks(params);
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching personal tasks:', error);
      toast.error('Greška pri učitavanju ličnih zadataka');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = (filters: any) => {
    setAdvancedFilters(filters);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj zadatak?')) {
      return;
    }

    try {
      await projectsService.deletePersonalTask(taskId);
      toast.success('Zadatak uspješno obrisan');
      fetchTasks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju zadatka');
    }
  };

  const getDueDateString = (task: Task): string | null => {
    if (!task.due_date) return null;
    return task.due_date.split('T')[0];
  };

  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter((task) => getDueDateString(task) === dateStr);
  };

  const getCalendarDays = () => {
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);

    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate.setDate(diff);

    const endDate = new Date(lastDay);
    const endDayOfWeek = endDate.getDay();
    const endDiff = endDate.getDate() - endDayOfWeek + (endDayOfWeek === 0 ? 0 : 7);
    endDate.setDate(endDiff);

    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setCalendarDate((prev) => {
      const monthOffset = direction === 'next' ? 1 : -1;
      return new Date(prev.getFullYear(), prev.getMonth() + monthOffset, 1);
    });
  };

  const goToToday = () => {
    setCalendarDate(new Date());
  };

  const weekDays = ['Ponedeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const weekDayShort = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Header with Controls - sticky da se vidi u Gantt prikazu */}
      <div className="sticky top-0 z-20 mb-2 w-full border-b border-gray-200 bg-white/95 pb-3 backdrop-blur dark:border-dark-700 dark:bg-dark-900/95 sm:pb-4">
        {/* Header */}
        <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="shrink-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">Upravljanje zadacima</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              Lični i dodijeljeni zadaci na jednom mjestu, ukupno {tasks.length} {tasks.length === 1 ? 'zadatak' : 'zadataka'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAdvancedSearch(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600 sm:flex-none sm:px-4"
            >
              <FiFilter size={18} />
              <span>Napredna</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white transition-colors hover:bg-primary-700 sm:flex-none"
              title="Novi zadatak"
            >
              <FiPlus size={16} />
              <span className="sm:hidden">Novi</span>
              <span className="hidden sm:inline">Novi zadatak</span>
            </button>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 py-1 text-xs sm:text-sm rounded-md ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-dark-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                <FiList size={14} />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2 py-1 text-xs sm:text-sm rounded-md ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-dark-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                <FiGrid size={14} />
                <span className="hidden sm:inline">Tabela</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1 px-2 py-1 text-xs sm:text-sm rounded-md ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-dark-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                <FiCalendar size={14} />
                <span className="hidden sm:inline">Kalendar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-3 border-b border-gray-200 dark:border-dark-600 sm:mb-4">
          <nav className="-mb-px grid grid-cols-3 gap-1 sm:flex sm:gap-0 sm:space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`border-b-2 px-1 pb-2 text-center text-xs font-medium transition-colors sm:pb-3 sm:text-left sm:text-base ${
                activeTab === 'all'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Svi zadaci
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('created-for-others')}
              className={`border-b-2 px-1 pb-2 text-center text-xs font-medium transition-colors sm:pb-3 sm:text-left sm:text-base ${
                activeTab === 'created-for-others'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Kreirani za druge
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assigned-to-me')}
              className={`border-b-2 px-1 pb-2 text-center text-xs font-medium transition-colors sm:pb-3 sm:text-left sm:text-base ${
                activeTab === 'assigned-to-me'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Dodeljeni meni
            </button>
          </nav>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center mt-2">
          <input
            type="text"
            placeholder="Pretraga zadataka po nazivu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 dark:border-primary-700 dark:border-t-primary-300" />
              Učitavanje...
            </div>
          )}
        </div>
      </div>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        type="tasks"
      />

      {/* Content – lista, tabela ili kalendar */}
      <>
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
            <FiCheckSquare size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nema ličnih zadataka
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Kreirajte svoj prvi lični zadatak
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Kreiraj zadatak
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-4 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {task.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <FiFlag className={`${getPriorityColor(task.priority)}`} size={16} />
                    </div>

                    {task.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <FiCalendar size={14} className="sm:w-4 sm:h-4" />
                          <span>Rok: {new Date(task.due_date).toLocaleDateString('bs-BA')}</span>
                        </div>
                      )}
                      {task.estimated_hours && (
                        <div className="flex items-center gap-1">
                          <span>Procenjeno: {task.estimated_hours}h</span>
                        </div>
                      )}
                      {(task as any).created_by_name && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Kreirao:</span>
                          <span>{(task as any).created_by_name}</span>
                        </div>
                      )}
                      {(task.assignees && task.assignees.length > 0) || (task as any).assigned_to_name ? (
                        <div className="flex items-center gap-1">
                          <FiUser size={14} className="sm:w-4 sm:h-4" />
                          <span className="font-medium">Izvršilac:</span>
                          <span className="truncate max-w-[150px] sm:max-w-none">
                            {task.assignees && task.assignees.length > 0
                              ? task.assignees.map((a: any) => a.user_name || a.name).join(', ')
                              : (task as any).assigned_to_name || 'Nije dodeljen'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-4 mt-4 sm:mt-0">
                    <button
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setShowTaskDetailModal(true);
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors"
                      title="Uredi"
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Obriši"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'table' ? (
          <>
          <div className="space-y-3 md:hidden">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-semibold text-gray-900 dark:text-white">{task.title}</p>
                  <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p className={getPriorityColor(task.priority)}>Prioritet: {task.priority}</p>
                  <p>Rok: {task.due_date ? new Date(task.due_date).toLocaleDateString('bs-BA') : '-'}</p>
                  <p>Izvršilac: {task.assignees?.length ? task.assignees.map((a: any) => a.user_name || a.name).join(', ') : (task as any).assigned_to_name || 'Nije dodeljen'}</p>
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-dark-700">
                  <button
                    onClick={() => { setSelectedTaskId(task.id); setShowTaskDetailModal(true); }}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <FiEdit size={18} />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800 md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Naziv
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Prioritet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rok
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Kreirao
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Izvršilac
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Procena (h)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-dark-900 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={getPriorityColor(task.priority)}>{task.priority}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('bs-BA') : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {(task as any).created_by_name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.assignees && task.assignees.length > 0
                          ? task.assignees.map((a: any) => a.user_name || a.name).join(', ')
                          : (task as any).assigned_to_name || 'Nije dodeljen'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {task.estimated_hours ?? '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setShowTaskDetailModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Uredi"
                          >
                            <FiEdit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Obriši"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-dark-700 dark:bg-dark-800 sm:p-4">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth('prev')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 btn-secondary text-xs sm:text-sm"
                >
                  Danas
                </button>
                <button
                  onClick={() => changeMonth('next')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white ml-2">
                  {calendarDate.toLocaleDateString('bs-BA', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-2">
              {weekDays.map((day, i) => (
                <div
                  key={day}
                  className="border-b border-gray-200 p-1 text-center text-[10px] font-semibold text-gray-700 dark:border-dark-700 dark:text-gray-300 sm:p-2 sm:text-xs"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{weekDayShort[i]}</span>
                </div>
              ))}
            </div>
            <div className="mt-0.5 grid grid-cols-7 gap-0.5 sm:mt-2 sm:gap-2">
                {getCalendarDays().map((day, index) => {
                  const dayTasks = getTasksForDate(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isCurrentMonth = day.getMonth() === calendarDate.getMonth();

                  return (
                    <div
                      key={index}
                      className={`min-h-[56px] rounded-lg border border-gray-200 p-1 dark:border-dark-700 sm:min-h-[120px] sm:p-2 ${
                        isToday ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : ''
                      } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                    >
                      <div
                        className={`text-xs sm:text-sm font-medium mb-2 ${
                          isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayTasks.slice(0, 4).map((task) => (
                          <button
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskId(task.id);
                              setShowTaskDetailModal(true);
                            }}
                            className="w-full text-left px-2 py-1 rounded text-[11px] sm:text-xs bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors border-l-4 border-primary-400"
                            title={task.description || task.title}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium truncate text-gray-900 dark:text-white">
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-0.5">
                              <span className={`text-[10px] ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="text-[10px] text-gray-600 dark:text-gray-400">
                                {task.status}
                              </span>
                            </div>
                          </button>
                        ))}
                        {dayTasks.length > 4 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                            +{dayTasks.length - 4} više
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={() => {
          setShowCreateModal(false);
          fetchTasks();
        }}
      />

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <PersonalTaskDetailModal
          isOpen={showTaskDetailModal}
          onClose={() => {
            setShowTaskDetailModal(false);
            setSelectedTaskId(null);
          }}
          taskId={selectedTaskId}
          onTaskUpdated={fetchTasks}
          onTaskDeleted={fetchTasks}
        />
      )}
    </div>
  );
}

