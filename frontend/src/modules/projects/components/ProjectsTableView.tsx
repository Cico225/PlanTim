import { useState, useEffect, useMemo, useRef } from 'react';
import { FiFilter, FiChevronUp, FiChevronDown, FiEdit2, FiCheck, FiX, FiUser, FiPlus } from 'react-icons/fi';
import { projectsService, Task } from '@/services/projectsService';
import toast from 'react-hot-toast';
import CreateTaskModal from './CreateTaskModal';
import { format, parseISO } from 'date-fns';
import { srLatn } from 'date-fns/locale';

interface TableTask extends Task {
  project_name?: string;
  start_date?: string;
  end_date?: string;
  phase?: string; // Milestone or phase name
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function ProjectsTableView() {
  const [tasks, setTasks] = useState<TableTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Sorting
  const [sortField, setSortField] = useState<'start_date' | 'end_date'>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Inline editing
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<TableTask>>({});

  // Dodaj task modal (project must be selected)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<number | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks from all projects using Gantt chart endpoint
      const data: any = await projectsService.getGanttChart('all');
      
      // Create milestones map by project_id for phase lookup
      const milestonesByProject = new Map<number, any[]>();
      if (data.milestones && Array.isArray(data.milestones)) {
        data.milestones.forEach((milestone: any) => {
          const projectId = milestone.project_id;
          if (!milestonesByProject.has(projectId)) {
            milestonesByProject.set(projectId, []);
          }
          milestonesByProject.get(projectId)!.push(milestone);
        });
      }
      
      // Create projects map for quick lookup
      const projectsMap = new Map<number, any>();
      const allProjects = data.projects || [];
      allProjects.forEach((project: any) => {
        projectsMap.set(project.id, project);
      });
      
      // Also fetch all projects if not in response
      if (allProjects.length === 0) {
        try {
          const projectsResponse = await projectsService.getProjects();
          (projectsResponse.data || []).forEach((project: any) => {
            projectsMap.set(project.id, project);
          });
        } catch (error) {
          console.error('Error fetching projects for mapping:', error);
        }
      }
      
      // Transform tasks to include project name and dates
      const tasksWithProject = (data.tasks || []).map((task: any) => {
        // Get project name from map or task data
        let projectName = task.project_name;
        if (!projectName && task.project_id) {
          const project = projectsMap.get(task.project_id);
          projectName = project?.name || null;
        }
        if (!projectName) {
          // Try to find in projects list
          const foundProject = allProjects.find((p: any) => p.id === task.project_id);
          projectName = foundProject?.name || null;
        }
        
        // Find phase: parent task title, closest milestone, or column name
        let phase = '-';
        
        // First, check if task has a parent task (parent task title could be the phase)
        if (task.parent_task_title) {
          phase = task.parent_task_title;
        } else if (task.phase) {
          phase = task.phase;
        } else if (task.column_name) {
          // Column name might represent a phase
          phase = task.column_name;
        } else if (task.project_id && milestonesByProject.has(task.project_id)) {
          // Find closest milestone for this task's project
          const projectMilestones = milestonesByProject.get(task.project_id)!;
          const taskStartDate = task.start_date ? parseISO(task.start_date) : null;
          
          if (taskStartDate && projectMilestones.length > 0) {
            // Find milestone closest to task start date
            let closestMilestone = projectMilestones[0];
            let minDiff = Math.abs(taskStartDate.getTime() - parseISO(projectMilestones[0].target_date).getTime());
            
            for (let i = 1; i < projectMilestones.length; i++) {
              const milestoneDate = parseISO(projectMilestones[i].target_date);
              const diff = Math.abs(taskStartDate.getTime() - milestoneDate.getTime());
              
              if (diff < minDiff) {
                minDiff = diff;
                closestMilestone = projectMilestones[i];
              }
            }
            
            if (closestMilestone) {
              phase = closestMilestone.name;
            }
          } else if (projectMilestones.length > 0) {
            // If no start date, use first milestone
            phase = projectMilestones[0].name;
          }
        }
        
        // Format dates
        let startDate: string | null = null;
        if (task.start_date) {
          startDate = format(parseISO(task.start_date), 'yyyy-MM-dd');
        } else if (task.created_at) {
          startDate = format(parseISO(task.created_at), 'yyyy-MM-dd');
        }
        
        let endDate: string | null = null;
        if (task.end_date) {
          endDate = format(parseISO(task.end_date), 'yyyy-MM-dd');
        } else if (task.due_date) {
          endDate = format(parseISO(task.due_date), 'yyyy-MM-dd');
        }
        
        return {
          ...task,
          project_name: projectName || '-',
          start_date: startDate,
          end_date: endDate,
          phase: phase,
        };
      });
      
      setTasks(tasksWithProject);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error(error.response?.data?.message || 'Greška pri učitavanju zadataka');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectsService.getProjects();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await projectsService.getUsersAndRoles();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSort = (field: 'start_date' | 'end_date') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEditStart = (task: TableTask) => {
    setEditingTask(task.id);
    setEditData({
      title: task.title,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to ?? (task.assignees?.[0] as { user_id?: number })?.user_id,
      start_date: task.start_date || '',
      end_date: task.end_date || '',
    });
  };

  const handleAddTaskClick = () => {
    if (filterProject !== 'all') {
      setCreateTaskProjectId(parseInt(filterProject, 10));
      setShowCreateTaskModal(true);
    } else {
      setShowProjectDropdown((v) => !v);
    }
  };

  const handleSelectProjectForNewTask = (projectId: number) => {
    setCreateTaskProjectId(projectId);
    setShowCreateTaskModal(true);
    setShowProjectDropdown(false);
  };

  const handleEditCancel = () => {
    setEditingTask(null);
    setEditData({});
  };

  const handleEditSave = async (taskId: number, projectId: number) => {
    try {
      // Find the current task to get required fields
      const currentTask = tasks.find(t => t.id === taskId);
      if (!currentTask) {
        toast.error('Zadatak nije pronađen');
        return;
      }

      // Prepare update data with all required fields
      const updateData: any = {
        title: currentTask.title || 'Untitled Task',
        status: editData.status !== undefined ? editData.status : (currentTask.status || 'todo'),
        priority: currentTask.priority || 'medium',
      };
      
      // Add optional fields
      if (editData.assigned_to !== undefined) {
        updateData.assigned_to = editData.assigned_to || null;
        // Also try to update assignees if field exists
        if (editData.assigned_to) {
          updateData.assignee_ids = [editData.assigned_to];
        }
      }
      
      // Update task basic info first
      await projectsService.updateTask(projectId, taskId, updateData);
      
      // Update dates via Gantt endpoint (handles start_date and end_date properly)
      if (editData.start_date || editData.end_date) {
        try {
          await projectsService.updateTaskDates(projectId, taskId, {
            start_date: editData.start_date || undefined,
            end_date: editData.end_date || undefined,
          });
        } catch (error: any) {
          // If updateTaskDates fails, log but don't fail the whole update
          console.warn('Failed to update dates via Gantt endpoint:', error);
          // Try to update via regular updateTask as fallback
          try {
            const dateUpdateData: any = {
              ...updateData,
            };
            if (editData.start_date) dateUpdateData.start_date = editData.start_date;
            if (editData.end_date) dateUpdateData.end_date = editData.end_date;
            // Note: updateTask might not support start_date/end_date, so we ignore errors here
            await projectsService.updateTask(projectId, taskId, dateUpdateData).catch(() => {
              // Silently fail - dates might not be supported in updateTask
            });
          } catch (error2) {
            console.error('Failed to update dates:', error2);
          }
        }
      }
      
      toast.success('Zadatak ažuriran');
      setEditingTask(null);
      setEditData({});
      await fetchData();
    } catch (error: any) {
      console.error('Error updating task:', error);
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
                          'Greška pri ažuriranju zadatka';
      toast.error(errorMessage);
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply filters
    if (filterProject !== 'all') {
      filtered = filtered.filter(task => task.project_id === parseInt(filterProject));
    }

    if (filterUser !== 'all') {
      filtered = filtered.filter(task => {
        const userId = parseInt(filterUser);
        return task.assigned_to === userId ||
               task.assignees?.some((a: any) => a.user_id === userId) ||
               task.assigned_to_name === users.find(u => u.id === userId)?.name;
      });
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aDate = a[sortField] ? parseISO(a[sortField]!).getTime() : 0;
      const bDate = b[sortField] ? parseISO(b[sortField]!).getTime() : 0;
      
      if (sortDirection === 'asc') {
        return aDate - bDate;
      } else {
        return bDate - aDate;
      }
    });

    return filtered;
  }, [tasks, filterProject, filterUser, filterStatus, sortField, sortDirection, users]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusOptions = () => {
    const statuses = new Set(tasks.map(t => t.status).filter(Boolean));
    return Array.from(statuses);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-dark-700 dark:bg-dark-800 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filteri:</span>
          </div>

          {/* Project Filter */}
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Projekt:</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:w-auto sm:py-1.5"
            >
              <option value="all">Svi projekti</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Korisnik:</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:w-auto sm:py-1.5"
            >
              <option value="all">Svi korisnici</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:w-auto sm:py-1.5"
            >
              <option value="all">Svi statusi</option>
              {getStatusOptions().map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Dodaj task */}
          <div className="relative w-full sm:ml-auto sm:w-auto" ref={projectDropdownRef}>
            {filterProject !== 'all' ? (
              <button
                type="button"
                onClick={handleAddTaskClick}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:w-auto"
              >
                <FiPlus size={18} />
                Dodaj task
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAddTaskClick}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:w-auto"
                >
                  <FiPlus size={18} />
                  Dodaj task
                </button>
                {showProjectDropdown && (
                  <div className="absolute right-0 top-full mt-1 py-1 w-56 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-dark-600">
                      Odaberite projekt
                    </div>
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSelectProjectForNewTask(project.id)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-700"
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filteredAndSortedTasks.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-dark-700 dark:bg-dark-800 dark:text-gray-400">
            Nema zadataka za prikaz
          </div>
        ) : (
          filteredAndSortedTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">{task.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{task.project_name || '-'}</p>
                </div>
                <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {task.phase && <p>Faza: {task.phase}</p>}
                <p className="flex items-center gap-1">
                  <FiUser size={14} />
                  {task.assigned_to_name ||
                    (task.assignees?.length ? task.assignees.map((a: any) => a.user_name).join(', ') : '-')}
                </p>
                <p>
                  {task.start_date ? format(parseISO(task.start_date), 'dd.MM.yyyy', { locale: srLatn }) : '-'}
                  {' – '}
                  {task.end_date ? format(parseISO(task.end_date), 'dd.MM.yyyy', { locale: srLatn }) : '-'}
                </p>
              </div>
              <div className="mt-3 flex justify-end border-t border-gray-200 pt-3 dark:border-dark-700">
                <button
                  onClick={() => handleEditStart(task)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title="Uredi"
                >
                  <FiEdit2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-dark-700 dark:bg-dark-800 md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Projekt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Faza
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Zadatak
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Korisnik
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
                  onClick={() => handleSort('start_date')}
                >
                  <div className="flex items-center gap-1">
                    Start
                    {sortField === 'start_date' && (
                      sortDirection === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
                  onClick={() => handleSort('end_date')}
                >
                  <div className="flex items-center gap-1">
                    End
                    {sortField === 'end_date' && (
                      sortDirection === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
              {filteredAndSortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Nema zadataka za prikaz
                  </td>
                </tr>
              ) : (
                filteredAndSortedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-900 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {task.project_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {task.phase || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {task.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingTask === task.id ? (
                        <select
                          value={editData.assigned_to || ''}
                          onChange={(e) => setEditData({ ...editData, assigned_to: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Nema korisnika</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {task.assigned_to_name && (
                            <div className="flex items-center gap-1">
                              <FiUser className="text-gray-400" size={14} />
                              <span className="text-sm text-gray-900 dark:text-white">
                                {task.assigned_to_name}
                              </span>
                            </div>
                          )}
                          {task.assignees && task.assignees.length > 0 && !task.assigned_to_name && (
                            <span className="text-sm text-gray-900 dark:text-white">
                              {task.assignees[0].user_name}
                              {task.assignees.length > 1 && ` +${task.assignees.length - 1}`}
                            </span>
                          )}
                          {!task.assigned_to_name && (!task.assignees || task.assignees.length === 0) && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingTask === task.id ? (
                        <select
                          value={editData.status || ''}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        >
                          {getStatusOptions().map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingTask === task.id ? (
                        <input
                          type="date"
                          value={editData.start_date || ''}
                          onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {task.start_date ? format(parseISO(task.start_date), 'dd.MM.yyyy', { locale: srLatn }) : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingTask === task.id ? (
                        <input
                          type="date"
                          value={editData.end_date || ''}
                          onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-dark-600 rounded bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {task.end_date ? format(parseISO(task.end_date), 'dd.MM.yyyy', { locale: srLatn }) : '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingTask === task.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditSave(task.id, task.project_id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Sačuvaj"
                          >
                            <FiCheck size={18} />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Otkaži"
                          >
                            <FiX size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditStart(task)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Uredi"
                        >
                          <FiEdit2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      {createTaskProjectId != null && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false);
            setCreateTaskProjectId(null);
          }}
          projectId={createTaskProjectId}
          onTaskCreated={() => {
            setShowCreateTaskModal(false);
            setCreateTaskProjectId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

