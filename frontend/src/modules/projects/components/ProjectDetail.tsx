import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit, FiTrash2, FiLayout } from 'react-icons/fi';
import { projectsService, Project } from '@/services/projectsService';
import toast from 'react-hot-toast';
import KanbanBoard from './KanbanBoard';

interface ProjectDetailProps {
  view?: 'overview' | 'kanban' | 'gantt';
}

export default function ProjectDetail({ view = 'overview' }: ProjectDetailProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

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

  // Show Kanban view if requested
  if (view === 'kanban') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 flex-shrink-0 gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <Link
              to={`/projects/${projectId}`}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
            >
              <FiArrowLeft size={20} />
            </Link>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Kanban Board</p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <KanbanBoard projectId={project.id} />
        </div>
      </div>
    );
  }

  // Default overview view
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
            <Link
              to={`/projects/${projectId}/kanban`}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiLayout size={18} />
              <span className="hidden sm:inline">Kanban Board</span>
              <span className="sm:hidden">Kanban</span>
            </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <FiTrash2 size={18} />
            Obriši
          </button>
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-sm">
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

        <div className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Napredak</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Ukupno</span>
                <span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Akcije</h3>
          <div className="space-y-2">
            <Link
              to={`/projects/${projectId}/kanban`}
              className="block w-full text-left px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30"
            >
              <FiLayout className="inline mr-2" />
              Kanban Board
            </Link>
            {/* TODO: Add more actions */}
          </div>
        </div>
      </div>

      {/* Tasks section will be added later */}
    </div>
  );
}

