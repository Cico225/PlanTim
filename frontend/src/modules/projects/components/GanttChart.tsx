import { useState, useEffect, useRef } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { projectsService } from '@/services/projectsService';
import toast from 'react-hot-toast';
import {
  format,
  addMonths,
  addDays,
  differenceInDays,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  startOfWeek,
} from 'date-fns';
import { srLatn } from 'date-fns/locale';

interface GanttChartProps {
  projectId: number | string;
  userId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  priority?: string | null;
}

interface GanttTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  start_date: string;
  end_date: string;
  due_date?: string;
  progress: number;
  assigned_to_name?: string;
  assigned_to?: number;
  project_name?: string;
  project_id?: number;
  assignees?: Array<{
    user_id: number;
    user_name: string;
    user_email: string;
  }>;
  subtasks?: GanttTask[];
}

interface Project {
  id: number;
  name: string;
  status: string;
  start_date?: string;
  end_date?: string;
  priority?: string;
  progress?: number;
}

type ViewMode = 'month' | 'week';

export default function GanttChart({ projectId, userId, dateFrom, dateTo, priority }: GanttChartProps) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [allTasks, setAllTasks] = useState<GanttTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week'); // 'month' ili 'week' - defaultno sedmica
  const [calculatedDayWidth, setCalculatedDayWidth] = useState(50);

  useEffect(() => {
    fetchGanttData();
  }, [projectId]);

  // Calculate optimal day width based on available space
  const calculateDayWidth = () => {
    if (timelineRef.current) {
      const timelineWidth = timelineRef.current.clientWidth;
      const daysInView = getDaysInMonth().length;
      if (daysInView > 0) {
        // Calculate width: available width minus padding, divided by number of days
        const padding = 40; // Left padding for timeline
        const availableWidth = timelineWidth - padding;
        const calculatedWidth = Math.max(25, Math.floor(availableWidth / daysInView));
        setCalculatedDayWidth(calculatedWidth);
      }
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure DOM is rendered
    const timer = setTimeout(() => {
      calculateDayWidth();
    }, 100);
    
    // Recalculate on window resize
    const handleResize = () => {
      calculateDayWidth();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [viewMode, currentDate]);

  useEffect(() => {
    // Filter tasks by user, date range, and priority
    let filtered = allTasks;
    
    // Filter by user
    if (userId) {
      filtered = filtered.filter((task) => {
        // Check if user is assigned via assigned_to
        if (task.assigned_to === userId) return true;
        
        // Check if user is in assignees array
        if (task.assignees && task.assignees.some((a) => a.user_id === userId)) {
          return true;
        }
        
        return false;
      });
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      filtered = filtered.filter((task) => {
        const taskStart = task.start_date ? new Date(task.start_date) : null;
        const taskEnd = task.end_date ? new Date(task.end_date) : null;
        
        if (dateFrom && dateTo) {
          // Task overlaps with date range if:
          // - task starts before or on end date AND task ends after or on start date
          const fromDate = new Date(dateFrom);
          const toDate = new Date(dateTo);
          
          if (taskStart && taskEnd) {
            return taskStart <= toDate && taskEnd >= fromDate;
          } else if (taskStart) {
            return taskStart <= toDate;
          } else if (taskEnd) {
            return taskEnd >= fromDate;
          }
          return false;
        } else if (dateFrom) {
          // Task starts or ends after dateFrom
          const fromDate = new Date(dateFrom);
          if (taskEnd) {
            return taskEnd >= fromDate;
          } else if (taskStart) {
            return taskStart >= fromDate;
          }
          return false;
        } else if (dateTo) {
          // Task starts or ends before dateTo
          const toDate = new Date(dateTo);
          if (taskStart) {
            return taskStart <= toDate;
          } else if (taskEnd) {
            return taskEnd <= toDate;
          }
          return false;
        }
        
        return true;
      });
    }
    
    // Filter by priority
    if (priority) {
      filtered = filtered.filter((task) => {
        return task.priority === priority;
      });
    }
    
    setTasks(filtered);
  }, [userId, allTasks, dateFrom, dateTo, priority]);

  useEffect(() => {
    if (tasks.length > 0 || projects.length > 0) {
      calculateDateRange();
    }
  }, [tasks, projects, currentDate]);

  const fetchGanttData = async () => {
    try {
      setLoading(true);
      const data: any = await projectsService.getGanttChart(projectId);

      setAllTasks(data.tasks || []);
      setTasks(data.tasks || []);
      
      // Set projects - API returns 'projects' array for 'all', or 'project' object for single project
      if (projectId === 'all' || projectId === 'All') {
        // For 'all' projects, API returns 'projects' array
        if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects(data.projects.map((p: any) => ({
            ...p,
            status: p.status || 'active',
          })));
        } else {
          // Fallback: fetch all projects
          try {
            const projectsData = await projectsService.getProjects();
            setProjects((projectsData.data || []).map((p: any) => ({
              ...p,
              status: p.status || 'active',
            })));
          } catch (error) {
            console.error('Failed to fetch projects:', error);
          }
        }
      } else {
        // For single project, API returns 'project' object
        if (data.project && data.project.id) {
          try {
            const projectsData = await projectsService.getProjects();
            const fullProject = projectsData.data?.find((p: any) => p.id === data.project.id);
            if (fullProject) {
              setProjects([{
                ...fullProject,
                status: fullProject.status || 'active',
              }]);
            } else {
              setProjects([{
                ...data.project,
                status: data.project.status || 'active',
              }]);
            }
          } catch (error) {
            setProjects([{
              ...data.project,
              status: data.project.status || 'active',
            }]);
          }
        } else if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
          // Fallback: if projects array is returned for single project
          setProjects(data.projects.map((p: any) => ({
            ...p,
            status: p.status || 'active',
          })));
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri učitavanju Gantt chart podataka');
    } finally {
      setLoading(false);
    }
  };

  const calculateDateRange = () => {
    const allDates: Date[] = [];

    // Add project dates
    projects.forEach((project) => {
      if (project.start_date) allDates.push(parseISO(project.start_date));
      if (project.end_date) allDates.push(parseISO(project.end_date));
    });

    // Add task dates
    tasks.forEach((task) => {
      if (task.start_date) allDates.push(parseISO(task.start_date));
      if (task.end_date) allDates.push(parseISO(task.end_date));
    });

    if (allDates.length === 0) {
      const today = new Date();
      setDateRange({
        start: startOfMonth(today),
        end: endOfMonth(addMonths(today, 3)),
      });
      return;
    }

    const minDate = allDates.reduce((min, date) => (date < min ? date : min), allDates[0]);
    const maxDate = allDates.reduce((max, date) => (date > max ? date : max), allDates[allDates.length - 1]);

    // Set range to show current month by default, but expand if needed
    const rangeStart = startOfMonth(currentDate);
    const rangeEnd = endOfMonth(currentDate);
    
    setDateRange({
      start: rangeStart < minDate ? startOfMonth(minDate) : rangeStart,
      end: rangeEnd > maxDate ? endOfMonth(maxDate) : rangeEnd,
    });
  };

  const getStatusColor = (status: string | undefined | null): string => {
    if (!status) return '#6366f1';
    const statusLower = status.toLowerCase();
    const colorMap: Record<string, string> = {
      planning: '#a855f7', // Purple
      active: '#f97316', // Orange
      'in-progress': '#3b82f6', // Blue
      todo: '#8b5cf6', // Light purple
      review: '#fbbf24', // Yellow
      done: '#10b981', // Green
      completed: '#1e40af', // Dark blue
      'on-hold': '#6b7280', // Gray
      cancelled: '#ef4444', // Red
    };
    return colorMap[statusLower] || '#6366f1';
  };

  const getPriorityColor = (priority: string | undefined | null): string => {
    if (!priority) return '#6366f1';
    const priorityLower = priority.toLowerCase();
    const colorMap: Record<string, string> = {
      urgent: '#ef4444', // Red
      high: '#f97316', // Orange
      medium: '#3b82f6', // Blue
      low: '#10b981', // Green
    };
    return colorMap[priorityLower] || '#6366f1';
  };

  const getTaskColor = (task: GanttTask): string => {
    // Use priority color if urgent/high, otherwise use status color
    if (task.priority === 'urgent' || task.priority === 'high') {
      return getPriorityColor(task.priority);
    }
    return getStatusColor(task.status);
  };

  const getDaysInMonth = (): Date[] => {
    if (viewMode === 'week') {
      // Prikazuje sedmicu
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Ponedeljak
      const weekEnd = addDays(weekStart, 6); // Nedelja
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // Prikazuje cijeli mjesec - uvek sve dane od početka do kraja meseca
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
      // Osiguravamo da imamo sve dane
      return allDays;
    }
  };

  const handlePreviousPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getItemPosition = (startDate: string, endDate: string) => {
    const daysToShow = getDaysInMonth();
    if (daysToShow.length === 0) return { left: 0, width: 0 };

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const chartStart = daysToShow[0]; // Prvi dan u prikazu

    const daysFromStart = differenceInDays(start, chartStart);
    const taskDuration = differenceInDays(end, start) + 1;

    const dayWidth = calculatedDayWidth;
    const left = Math.max(0, daysFromStart * dayWidth);
    const width = Math.max(taskDuration * dayWidth, dayWidth * 0.5); // Minimum width je 50% dana

    return { left, width, dayWidth };
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserColor = (name: string): string => {
    const colors = [
      '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
      '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
      '#a855f7', '#d946ef', '#ec4899',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Group tasks by project
  const tasksByProject = new Map<number | null, GanttTask[]>();
  const standaloneTasks: GanttTask[] = [];

  tasks.forEach((task) => {
    const projId = task.project_id || null;
    if (projId) {
      if (!tasksByProject.has(projId)) {
        tasksByProject.set(projId, []);
      }
      tasksByProject.get(projId)!.push(task);
    } else {
      standaloneTasks.push(task);
    }
  });

  // Create items structure
  const itemsByProject = new Map<number | null, Array<{ type: 'project' | 'task'; data: Project | GanttTask }>>();

  // Add projects with their tasks (only show projects that have tasks matching the filter)
  projects.forEach((project) => {
    const projectTasks = tasksByProject.get(project.id) || [];
    // Only add project if it has tasks (when filtering by user, empty projects won't be shown)
    if (projectTasks.length > 0) {
      const items: Array<{ type: 'project' | 'task'; data: Project | GanttTask }> = [
        { type: 'project', data: project },
        ...projectTasks.map((task) => ({ type: 'task' as const, data: task })),
      ];
      itemsByProject.set(project.id, items);
    }
  });

  // Add standalone tasks
  if (standaloneTasks.length > 0) {
    itemsByProject.set(null, standaloneTasks.map((task) => ({ type: 'task' as const, data: task })));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dateRange) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Učitavanje podataka...</p>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();
  // Calculate day width - use calculated or fallback based on view mode and available space
  let dayWidth = calculatedDayWidth;
  if (!dayWidth || dayWidth < 25) {
    // Fallback calculation if not calculated yet - estimate based on typical screen width
    if (viewMode === 'month') {
      // For month view, estimate: ~1200px available / 31 days = ~39px per day
      dayWidth = 35;
    } else {
      // For week view: ~1200px / 7 days = ~171px per day
      dayWidth = 150;
    }
  }
  // Calculate chart width for all days
  const chartWidth = daysInMonth.length * dayWidth;
  const todayDate = new Date();
  const chartStart = daysInMonth.length > 0 ? daysInMonth[0] : todayDate;
  const todayPosition = differenceInDays(todayDate, chartStart) * dayWidth;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800 overflow-hidden">
      {/* Date Navigation - Compact */}
      <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousPeriod}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title={viewMode === 'week' ? 'Prethodna sedmica' : 'Prethodni mjesec'}
          >
            <FiChevronLeft size={18} />
          </button>
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white min-w-[140px] sm:min-w-[180px] text-center">
            {viewMode === 'week' 
              ? `${format(getDaysInMonth()[0], 'dd.MM', { locale: srLatn })} - ${format(getDaysInMonth()[getDaysInMonth().length - 1], 'dd.MM.yyyy', { locale: srLatn })}`
              : format(currentDate, 'MMMM yyyy', { locale: srLatn })
            }
          </h2>
          <button
            onClick={handleNextPeriod}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title={viewMode === 'week' ? 'Sledeća sedmica' : 'Sledeći mjesec'}
          >
            <FiChevronRight size={18} />
          </button>
          <button
            onClick={() => {
              setCurrentDate(new Date());
            }}
            className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Danas
          </button>
        </div>
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'week'
                ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Sedmica
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'month'
                ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Mjesec
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex">
        {/* Left Sidebar */}
        <div className="flex-shrink-0 w-80 border-r border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 overflow-y-auto">
          <div className="p-2 space-y-1.5">
            {Array.from(itemsByProject.entries()).map(([projectId, items]) => {
              const project = items.find((i) => i.type === 'project')?.data as Project | undefined;
              const projectTasks = items.filter((i) => i.type === 'task').map((i) => i.data as GanttTask).filter((t) => t);

              if (!project && projectTasks.length === 0) return null;

              return (
                <div key={projectId || 'no-project'} className="space-y-2">
                  {project && (
                    <div
                      className={`p-2 rounded border cursor-pointer transition-all ${
                        selectedItem === project.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800'
                      }`}
                      onClick={() => setSelectedItem(selectedItem === project.id ? null : project.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0"></div>
                        <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">{project.name}</h3>
                      </div>
                      {project.start_date && project.end_date && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 ml-4 mt-0.5">
                          {format(parseISO(project.start_date), 'dd.MM.yyyy', { locale: srLatn })} -{' '}
                          {format(parseISO(project.end_date), 'dd.MM.yyyy', { locale: srLatn })}
                        </div>
                      )}
                    </div>
                  )}

                  {projectTasks.map((task) => {
                    const assignees = task.assignees || [];
                    const mainAssignee = task.assigned_to_name || (assignees.length > 0 ? assignees[0].user_name : null);
                    const color = getTaskColor(task);

                    return (
                      <div
                        key={task.id}
                        className={`p-2 ml-3 rounded border cursor-pointer transition-all ${
                          selectedItem === task.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800'
                        }`}
                        onClick={() => setSelectedItem(selectedItem === task.id ? null : task.id)}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <h4 className="font-medium text-xs text-gray-900 dark:text-white truncate">{task.title}</h4>
                        </div>
                        {task.start_date && task.end_date && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 ml-4 mb-1">
                            {format(parseISO(task.start_date), 'dd.MM.yyyy', { locale: srLatn })} -{' '}
                            {format(parseISO(task.end_date), 'dd.MM.yyyy', { locale: srLatn })}
                          </div>
                        )}
                        {mainAssignee && (
                          <div className="flex items-center ml-4">
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: getUserColor(mainAssignee) }}
                            >
                              {getInitials(mainAssignee)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {projects.length === 0 && tasks.length === 0 && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Nema projekata ili taskova za prikaz
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col" ref={timelineRef}>
          <div className="flex-1 overflow-x-auto overflow-y-auto" ref={ganttRef}>
            <div className="inline-block" style={{ width: `${chartWidth + 20}px`, minWidth: `${chartWidth + 20}px` }}>
              {/* Timeline Header */}
              <div className="sticky top-0 z-20 bg-gray-100 dark:bg-dark-700 border-b border-gray-300 dark:border-dark-600">
                <div className="flex" style={{ paddingLeft: '20px', width: `${chartWidth}px` }}>
                  {daysInMonth.map((day, index) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={index}
                      className={`border-r border-gray-300 dark:border-dark-600 px-1 py-1 text-center flex-shrink-0 ${
                        isWeekend ? 'bg-gray-200 dark:bg-dark-600' : 'bg-white dark:bg-dark-800'
                      } ${isToday(day) ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                      style={{
                        width: `${dayWidth}px`,
                        minWidth: `${dayWidth}px`,
                      }}
                    >
                      <div className="text-[11px] font-medium text-gray-900 dark:text-white">
                        {format(day, 'dd', { locale: srLatn })}
                      </div>
                      <div className="text-[9px] text-gray-500 dark:text-gray-400">
                        {format(day, 'EEE', { locale: srLatn })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today Indicator */}
            {todayPosition >= 0 && todayPosition <= chartWidth && (
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  left: `${todayPosition + 20}px`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: '#ef4444',
                }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-dark-800" />
              </div>
            )}

            {/* Grid & Items */}
            <div className="relative" style={{ width: `${chartWidth + 20}px` }}>
              {/* Grid Lines */}
              <div className="absolute inset-0" style={{ paddingLeft: '20px', width: `${chartWidth + 20}px` }}>
                {daysInMonth.map((day, index) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={index}
                      className={`absolute top-0 bottom-0 border-r ${
                        isWeekend ? 'border-gray-300 dark:border-dark-600' : 'border-gray-200 dark:border-dark-700'
                      }`}
                      style={{
                        left: `${index * dayWidth}px`,
                        width: '1px',
                      }}
                    />
                  );
                })}
              </div>

              {/* Project and Task Bars */}
              <div className="relative" style={{ paddingTop: '5px' }}>
                {Array.from(itemsByProject.entries()).map(([projectId, items]) => {
                  const project = items.find((i) => i.type === 'project')?.data as Project | undefined;
                  const projectTasks = items.filter((i) => i.type === 'task').map((i) => i.data as GanttTask);

                  return (
                    <div key={projectId || 'no-project'} className="mb-2">
                      {/* Project Bar */}
                      {project && project.start_date && project.end_date && (() => {
                        const projectPos = getItemPosition(project.start_date, project.end_date);
                        
                        return (
                          <div className="relative h-7 mb-0.5 border-b border-gray-300 dark:border-dark-600">
                            <div
                              className={`absolute top-0.5 h-6 flex items-center px-2 cursor-pointer transition-all ${
                                selectedItem === project.id ? 'ring-2 ring-blue-500 z-10' : ''
                              }`}
                              style={{
                                left: `${projectPos.left + 20}px`,
                                width: `${projectPos.width}px`,
                                backgroundColor: getStatusColor(project?.status),
                                minWidth: '50px',
                              }}
                              onClick={() => setSelectedItem(selectedItem === project.id ? null : project.id)}
                            >
                              <span className="text-white text-[11px] font-semibold truncate">{project.name}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Task Bars */}
                      {projectTasks.map((task) => {
                        if (!task.start_date || !task.end_date) return null;

                        const { left, width } = getItemPosition(task.start_date, task.end_date);
                        const color = getTaskColor(task);

                        return (
                          <div key={task.id} className="relative h-7 mb-0.5 border-b border-gray-200 dark:border-dark-700">
                            <div
                              className={`absolute top-0.5 h-6 flex items-center px-1.5 cursor-pointer transition-all ${
                                selectedItem === task.id ? 'ring-2 ring-blue-500 z-10' : ''
                              }`}
                              style={{
                                left: `${left + 20}px`,
                                width: `${width}px`,
                                backgroundColor: color,
                                minWidth: '50px',
                              }}
                              onClick={() => setSelectedItem(selectedItem === task.id ? null : task.id)}
                              title={`${task.title} - ${format(parseISO(task.start_date), 'dd.MM.yyyy', { locale: srLatn })} - ${format(parseISO(task.end_date), 'dd.MM.yyyy', { locale: srLatn })}`}
                            >
                              <span className="text-white text-[10px] font-semibold truncate">
                                {format(parseISO(task.start_date), 'dd.MM.yyyy', { locale: srLatn })} {task.title}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

