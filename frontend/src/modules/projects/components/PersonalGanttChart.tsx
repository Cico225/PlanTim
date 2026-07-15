import { useState, useEffect, useRef } from 'react';
import { FiZoomIn, FiZoomOut, FiFlag, FiUser, FiX } from 'react-icons/fi';
import { projectsService, Task } from '@/services/projectsService';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import {
  format,
  addDays,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';
import { srLatn } from 'date-fns/locale';

type PersonalGanttTask = Task & {
  start_date?: string;
};

interface User {
  id: number;
  name: string;
  email: string;
}

interface PersonalGanttChartProps {
  onTaskClick?: (taskId: number) => void;
  refreshTrigger?: number;
}

export default function PersonalGanttChart({ onTaskClick, refreshTrigger }: PersonalGanttChartProps) {
  const [tasks, setTasks] = useState<PersonalGanttTask[]>([]);
  const [allTasks, setAllTasks] = useState<PersonalGanttTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);
  const [filteredStatus, setFilteredStatus] = useState<string | null>(null);
  const [filteredUserId, setFilteredUserId] = useState<number | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const ganttRef = useRef<HTMLDivElement | null>(null);

  // Helpers
  const getTaskDates = (task: PersonalGanttTask) => {
    const startDate = task.start_date ? parseISO(task.start_date) : parseISO(task.created_at);
    const endDateRaw = task.due_date ? parseISO(task.due_date) : addDays(startDate, 1);
    const endDate = endDateRaw >= startDate ? endDateRaw : addDays(startDate, 1);
    return { startDate, endDate };
  };

  const getTaskPosition = (task: PersonalGanttTask, start: Date, dayWidth: number) => {
    const { startDate, endDate } = getTaskDates(task);
    const daysFromStart = Math.max(0, differenceInDays(startDate, start));
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
    return {
      left: daysFromStart * dayWidth,
      width: duration * dayWidth,
    };
  };

  const getTimelineDates = (start: Date, end: Date) => {
    if (zoomLevel === 1) {
      return eachDayOfInterval({ start, end });
    }
    if (zoomLevel === 2) {
      const weeks: Date[] = [];
      let current = startOfWeek(start, { locale: srLatn });
      const limit = endOfWeek(end, { locale: srLatn });
      while (current <= limit) {
        weeks.push(current);
        current = addDays(current, 7);
      }
      return weeks;
    }
    const months: Date[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth() + 1, 1);
    while (current < limit) {
      months.push(current);
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    return months;
  };

  const formatTimelineLabel = (date: Date) => {
    if (zoomLevel === 3) {
      return format(date, 'MMM yyyy', { locale: srLatn });
    }
    return format(date, 'dd MMM', { locale: srLatn });
  };

  const getTaskColor = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return 'bg-green-500 hover:bg-green-600';
      case 'in-progress':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'review':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-400 hover:bg-gray-500';
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'review':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return 'Završeno';
      case 'in-progress':
        return 'U toku';
      case 'review':
        return 'Pregled';
      case 'todo':
        return 'Planirano';
      default:
        return status;
    }
  };

  const getAllStatuses = () => {
    const s = new Set<string>();
    allTasks.forEach((t) => t.status && s.add(t.status));
    return Array.from(s);
  };

  const getUsersFromTasks = (): User[] => {
    const map = new Map<number, User>();
    allTasks.forEach((task) => {
      if (task.created_by_name) {
        const u = availableUsers.find((x) => x.name === task.created_by_name);
        if (u) map.set(u.id, u);
      }
      if (task.assigned_to_name) {
        const u = availableUsers.find((x) => x.name === task.assigned_to_name);
        if (u) map.set(u.id, u);
      }
      if (task.assignees) {
        task.assignees.forEach((a: any) => {
          if (a.user_id) {
            const u = availableUsers.find((x) => x.id === a.user_id);
            if (u) map.set(u.id, u);
          }
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getSelectedUserName = () => {
    if (!filteredUserId) return null;
    const u = availableUsers.find((x) => x.id === filteredUserId);
    return u?.name ?? null;
  };

  // Data fetching
  useEffect(() => {
    let mounted = true;

    const fetchUsers = async () => {
      try {
        const res = await apiService.get<User[]>('/chat/users');
        if (mounted) setAvailableUsers(res || []);
      } catch (e) {
        console.error('Error fetching users:', e);
      }
    };

    const fetchTasks = async () => {
      try {
        setLoading(true);
        const data = await projectsService.getPersonalTasks();
        if (!mounted) return;
        setAllTasks(data || []);

        const dates: Date[] = [];
        (data || []).forEach((task: PersonalGanttTask) => {
          const { startDate, endDate } = getTaskDates(task);
          dates.push(startDate, endDate);
        });

        const today = new Date();
        if (dates.length > 0) {
          const min = dates.reduce((m, d) => (d < m ? d : m));
          const max = dates.reduce((m, d) => (d > m ? d : m));
          setDateRange({
            start: startOfWeek(min, { locale: srLatn }),
            end: endOfWeek(addDays(max, 30), { locale: srLatn }),
          });
        } else {
          setDateRange({
            start: startOfWeek(today, { locale: srLatn }),
            end: endOfWeek(addDays(today, 30), { locale: srLatn }),
          });
        }
      } catch (error: any) {
        if (mounted) {
          toast.error(error?.response?.data?.message || 'Greška pri učitavanju zadataka');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const load = async () => {
      await fetchTasks();
      await fetchUsers();
    };

    load();

    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  // Apply filters whenever they change
  useEffect(() => {
    if (!dateRange) return;
    let list = [...allTasks];

    if (filteredStatus) {
      list = list.filter((t) => t.status === filteredStatus);
    }
    if (filteredUserId) {
      list = list.filter((task) => {
        const isCreator =
          task.created_by === filteredUserId ||
          (task.created_by_name &&
            availableUsers.find((u) => u.id === filteredUserId)?.name === task.created_by_name);
        const isAssignee =
          task.assigned_to === filteredUserId ||
          (task.assigned_to_name &&
            availableUsers.find((u) => u.id === filteredUserId)?.name === task.assigned_to_name);
        const isInAssignees =
          task.assignees && task.assignees.some((a: any) => a.user_id === filteredUserId);
        return isCreator || isAssignee || isInAssignees;
      });
    }

    setTasks(list);
  }, [filteredStatus, filteredUserId, allTasks, availableUsers, dateRange]);

  const handleZoomIn = () => setZoomLevel((z) => (z < 3 ? ((z + 1) as 1 | 2 | 3) : z));
  const handleZoomOut = () => setZoomLevel((z) => (z > 1 ? ((z - 1) as 1 | 2 | 3) : z));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!dateRange) {
    return <div className="text-center py-8 text-gray-500">Nema zadataka za prikaz</div>;
  }

  const timelineDates = getTimelineDates(dateRange.start, dateRange.end);
  const dayWidth = zoomLevel === 1 ? 40 : zoomLevel === 2 ? 120 : 300;

  return (
    <div
      className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden flex flex-col"
      style={{ maxHeight: 'calc(100vh - 260px)' }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-end p-4 border-b border-gray-200 dark:border-dark-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel === 1}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Umanji"
          >
            <FiZoomOut size={20} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
            {zoomLevel === 1 ? 'Dan' : zoomLevel === 2 ? 'Nedelja' : 'Mesec'}
          </span>
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel === 3}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Uvećaj"
          >
            <FiZoomIn size={20} />
          </button>
        </div>
      </div>

      {/* Gantt + legenda */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Gantt Chart */}
        <div className="overflow-x-auto" ref={ganttRef}>
          <div
            className="min-w-full"
            style={{ width: Math.max(timelineDates.length * dayWidth, 800) }}
          >
            {/* Timeline header */}
            <div className="sticky top-0 z-10 bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
              <div className="flex">
                <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-dark-600 p-2 font-semibold text-gray-900 dark:text-white">
                  Zadatak
                </div>
                <div className="flex-1 flex">
                  {timelineDates.map((d, i) => (
                    <div
                      key={i}
                      className="border-r border-gray-200 dark:border-dark-600 p-2 text-center text-sm text-gray-700 dark:text-gray-300"
                      style={{ minWidth: dayWidth }}
                    >
                      {formatTimelineLabel(d)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="relative">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {filteredStatus || filteredUserId
                    ? `Nema zadataka koji odgovaraju filterima${
                        filteredStatus ? ` (status: ${getStatusLabel(filteredStatus)})` : ''
                      }${filteredUserId ? ` (korisnik: ${getSelectedUserName()})` : ''}`
                    : 'Nema zadataka za prikaz'}
                </div>
              ) : (
                tasks.map((task) => {
                  const { startDate, endDate } = getTaskDates(task);
                  const pos = getTaskPosition(task, dateRange.start, dayWidth);
                  return (
                    <div
                      key={task.id}
                      className="relative border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                      style={{ height: '60px' }}
                    >
                      <div className="flex items-center h-full">
                        {/* Task info */}
                        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-dark-600 p-3 flex items-center gap-2">
                          <FiFlag
                            className={
                              task.priority === 'urgent'
                                ? 'text-red-500'
                                : task.priority === 'high'
                                ? 'text-orange-500'
                                : 'text-gray-400'
                            }
                            size={16}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {task.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {format(startDate, 'dd.MM.yyyy', { locale: srLatn })} -{' '}
                              {format(endDate, 'dd.MM.yyyy', { locale: srLatn })}
                            </div>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="flex-1 relative h-full">
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-8 rounded cursor-pointer transition-all ${getTaskColor(
                              task.status,
                            )}`}
                            style={{
                              left: `${pos.left}px`,
                              width: `${Math.max(pos.width, 20)}px`,
                            }}
                            onClick={() => onTaskClick && onTaskClick(task.id)}
                            title={task.description || task.title}
                          >
                            <div className="flex items-center h-full px-2 text-white text-sm font-medium truncate">
                              {task.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Legend / filters */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700 space-y-4">
          {/* Status filters */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
            </div>
            <button
              onClick={() => setFilteredStatus(null)}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                filteredStatus === null
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                  : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
              }`}
            >
              <div className="w-4 h-4 bg-gray-300 rounded" />
              <span>Svi</span>
              <span className="text-xs">({allTasks.length})</span>
            </button>
            {getAllStatuses().map((status) => {
              const count = allTasks.filter((t) => t.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setFilteredStatus(status)}
                  className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
                    filteredStatus === status
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                      : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded ${getStatusColorClass(status)}`} />
                  <span>{getStatusLabel(status)}</span>
                  <span className="text-xs">({count})</span>
                </button>
              );
            })}
          </div>

          {/* User filter */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <FiUser className="text-gray-700 dark:text-gray-300" size={16} />
              <span className="font-medium text-gray-700 dark:text-gray-300">Korisnik:</span>
            </div>
            <div className="relative">
              <select
                value={filteredUserId || ''}
                onChange={(e) => setFilteredUserId(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none pr-8"
              >
                <option value="">Svi korisnici</option>
                {getUsersFromTasks().map((user) => {
                  const taskCount = allTasks.filter((task) => {
                    const isCreator = task.created_by_name === user.name;
                    const isAssignee = task.assigned_to_name === user.name;
                    const isInAssignees = task.assignees?.some((a: any) => a.user_id === user.id);
                    return isCreator || isAssignee || isInAssignees;
                  }).length;
                  return (
                    <option key={user.id} value={user.id}>
                      {user.name} ({taskCount})
                    </option>
                  );
                })}
              </select>
              {filteredUserId && (
                <button
                  onClick={() => setFilteredUserId(null)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  title="Ukloni filter"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

