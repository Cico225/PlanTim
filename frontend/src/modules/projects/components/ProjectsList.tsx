import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiFolder, FiEdit, FiTrash2, FiTrendingUp, FiGrid, FiList, FiFilter } from 'react-icons/fi';
import { projectsService, Project } from '@/services/projectsService';
import AdvancedSearchModal from './AdvancedSearchModal';
import toast from 'react-hot-toast';

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [advancedFilters, setAdvancedFilters] = useState<any>({});

  useEffect(() => {
    fetchProjects();
  }, [currentPage, searchTerm, advancedFilters]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projectsService.getProjects({
        page: currentPage,
        search: searchTerm || undefined,
        ...advancedFilters,
      });
      setProjects(response.data || []);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Greška pri učitavanju projekata');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = (filters: any) => {
    setAdvancedFilters(filters);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Da li ste sigurni da želite obrisati projekt "${name}"?`)) {
      return;
    }

    try {
      await projectsService.deleteProject(id);
      toast.success('Projekt uspješno obrisan');
      fetchProjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju projekta');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'planning':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Projekti</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {projects.length} {projects.length === 1 ? 'projekt' : 'projekata'}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 sm:px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Grid prikaz"
            >
              <FiGrid size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 sm:px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="List prikaz"
            >
              <FiList size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Lista</span>
            </button>
          </div>
          <Link
            to="/projects/project-management/new"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm sm:text-base"
          >
            <FiPlus size={18} />
            <span className="hidden sm:inline">Novi projekat</span>
            <span className="sm:hidden">Novi</span>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 sm:gap-4">
        <input
          type="text"
          placeholder="Pretraga projekata po nazivu..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <button
          onClick={() => setShowAdvancedSearch(true)}
          className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors flex items-center gap-2"
          title="Napredna pretraga"
        >
          <FiFilter size={18} />
          <span className="hidden sm:inline">Napredna</span>
        </button>
      </div>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        type="projects"
      />

      {/* Projects Grid or List */}
      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-lg">
          <FiFolder className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'Nema rezultata pretrage' : 'Nema projekata'}
          </p>
          {!searchTerm && (
            <Link
              to="/projects/project-management/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <FiPlus size={18} />
              Kreiraj prvi projekat
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/project-management/${project.id}`}
              className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-dark-700"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {project.description || 'Bez opisa'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <span
                  className={`inline-block w-2 h-2 rounded-full ${getPriorityColor(project.priority)}`}
                  title={project.priority}
                />
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Napredak</span>
                  <span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Owner */}
              {project.owner_name && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Vlasnik: {project.owner_name}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/project-management/${project.id}`}
              className="bg-white dark:bg-dark-800 rounded-lg p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-dark-700 block"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {project.description || 'Bez opisa'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span
                        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(project.priority)}`}
                        title={project.priority}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {/* Progress */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Napredak</span>
                        <span className="font-medium text-gray-900 dark:text-white">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Owner */}
                    {project.owner_name && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Vlasnik:</span> {project.owner_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
          >
            Prethodna
          </button>
          <span className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
          >
            Sledeća
          </button>
        </div>
      )}
    </div>
  );
}


