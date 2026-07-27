import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiPlus, FiCheckSquare, FiClock, FiUser, FiFlag } from 'react-icons/fi';
import { projectsService, Project, Task } from '@/services/projectsService';
import toast from 'react-hot-toast';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchTasks();
    }
  }, [projectId]);

  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (!taskParam) {
      setSelectedTaskId(null);
      return;
    }

    const parsedTaskId = Number(taskParam);
    setSelectedTaskId(Number.isFinite(parsedTaskId) && parsedTaskId > 0 ? parsedTaskId : null);
  }, [searchParams]);

  const fetchProject = async () => {
    if (!projectId) return;

    // Check if projectId is a valid number (not "new" or other string)
    const projectIdNum = Number(projectId);
    if (isNaN(projectIdNum) || projectIdNum <= 0) {
      navigate('/projects');
      return;
    }

    try {
      setLoading(true);
      const data = await projectsService.getProject(projectIdNum);
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Greška pri učitavanju projekta');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!projectId) return;

    try {
      setTasksLoading(true);
      const data = await projectsService.getTasks(Number(projectId));
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Greška pri učitavanju zadataka');
    } finally {
      setTasksLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project || !projectId) return;

    if (!confirm(`Da li ste sigurni da želite obrisati projekt "${project.name}"?`)) {
      return;
    }

    try {
      await projectsService.deleteProject(Number(projectId));
      toast.success('Projekt uspješno obrisan');
      navigate('/projects');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju projekta');
    }
  };

  const openTask = (taskId: number) => {
    setSearchParams({ task: String(taskId) });
  };

  const closeTaskModal = () => {
    setSelectedTaskId(null);
    setSearchParams({});
  };

  const taskStats = useMemo(() => {
    const done = tasks.filter((task) => task.status === 'done').length;
    const inProgress = tasks.filter((task) => task.status === 'in-progress').length;

    return {
      total: tasks.length,
      done,
      inProgress,
    };
  }, [tasks]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in-progress':
        return 'U toku';
      case 'review':
        return 'Pregled';
      case 'done':
        return 'Završeno';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'review':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getPriorityDotClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-blue-500';
      case 'low':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Projekt nije pronađen</p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <FiArrowLeft size={18} />
          Vrati se na projekte
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/projects"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
          >
            <FiArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">{project.description || 'Bez opisa'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm text-white transition-colors hover:bg-primary-700 sm:px-4 sm:text-base"
          >
            <FiPlus size={18} />
            Novi zadatak
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiTrash2 size={18} />
            Obriši
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-primary-600 to-indigo-700 p-6 text-white shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-primary-100">Pregled projekta</p>
              <h3 className="mt-2 text-2xl font-semibold">{project.name}</h3>
              <p className="mt-2 max-w-2xl text-sm text-primary-100">
                {project.description || 'Dodajte opis projekta kako bi tim imao jasniji kontekst i cilj rada.'}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 text-right backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-primary-100">Napredak</p>
              <p className="text-2xl font-bold">{project.progress}%</p>
            </div>
          </div>
          <div className="mt-6 h-2.5 w-full rounded-full bg-white/20">
            <div className="h-2.5 rounded-full bg-white transition-all" style={{ width: `${project.progress}%` }} />
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-dark-800 dark:ring-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informacije</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
              <p className="text-gray-900 dark:text-white font-medium">{project.status}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">Prioritet</label>
              <p className="text-gray-900 dark:text-white font-medium">{project.priority}</p>
            </div>
            {project.owner_name && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Vlasnik</label>
                <p className="text-gray-900 dark:text-white font-medium">{project.owner_name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-dark-800 dark:ring-dark-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zadaci</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-dark-700/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">Ukupno</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{taskStats.total}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
              <p className="text-xs text-blue-600 dark:text-blue-300">U toku</p>
              <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-200">{taskStats.inProgress}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/10">
              <p className="text-xs text-emerald-600 dark:text-emerald-300">Gotovo</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-200">{taskStats.done}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-dark-800 dark:ring-dark-700 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-dark-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zadaci projekta</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Klikom na zadatak otvara se detalj sa izmjenama, komentarima i evidencijom rada.
            </p>
          </div>
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-900/40 dark:bg-primary-900/20 dark:text-primary-300"
          >
            <FiPlus size={16} />
            Dodijeli novi zadatak
          </button>
        </div>

        {tasksLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center dark:border-dark-600">
            <FiCheckSquare className="mx-auto mb-3 text-gray-400 dark:text-gray-500" size={34} />
            <p className="text-base font-medium text-gray-900 dark:text-white">Projekt još nema zadataka</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Dodajte prvi zadatak kako bi tim odmah imao jasan plan rada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => openTask(task.id)}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-white hover:shadow-sm dark:border-dark-700 dark:bg-dark-900/20 dark:hover:border-primary-700 dark:hover:bg-dark-700/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${getPriorityDotClass(task.priority)}`} />
                      <h4 className="truncate text-base font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                      {task.description || 'Zadatak nema dodatni opis.'}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1.5">
                    <FiFlag size={13} />
                    {task.priority}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiClock size={13} />
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('bs-BA') : 'Bez roka'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FiUser size={13} />
                    {task.assignees?.length
                      ? task.assignees.map((assignee) => assignee.user_name).join(', ')
                      : task.assigned_to_name || 'Nije dodijeljeno'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateTaskModal
        isOpen={showCreateTaskModal}
        projectId={Number(projectId)}
        onClose={() => setShowCreateTaskModal(false)}
        onTaskCreated={() => {
          setShowCreateTaskModal(false);
          fetchTasks();
          fetchProject();
        }}
      />

      {selectedTaskId && (
        <TaskDetailModal
          isOpen={selectedTaskId !== null}
          onClose={closeTaskModal}
          projectId={Number(projectId)}
          taskId={selectedTaskId}
          onTaskUpdated={() => {
            fetchTasks();
            fetchProject();
          }}
          onTaskDeleted={() => {
            closeTaskModal();
            fetchTasks();
            fetchProject();
          }}
        />
      )}
    </div>
  );
}
