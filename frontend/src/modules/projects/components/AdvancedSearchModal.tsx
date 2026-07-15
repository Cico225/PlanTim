import { useState, useEffect } from 'react';
import { FiX, FiSearch, FiCalendar, FiUser, FiTag, FiFlag, FiFilter } from 'react-icons/fi';
import { apiService } from '@/services/api';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: any) => void;
  type: 'projects' | 'tasks';
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
  type,
}: AdvancedSearchModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
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
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await apiService.get('/chat/users');
      setUsers(response || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserToggle = (userId: number, field: 'user_ids' | 'assignee_ids') => {
    setFilters((prev: any) => ({
      ...prev,
      [field]: prev[field].includes(userId)
        ? prev[field].filter((id: number) => id !== userId)
        : [...prev[field], userId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFilters: any = {};
    
    if (filters.status) cleanFilters.status = filters.status;
    if (filters.priority) cleanFilters.priority = filters.priority;
    if (filters.date_from) cleanFilters.date_from = filters.date_from;
    if (filters.date_to) cleanFilters.date_to = filters.date_to;
    if (filters.owner_id) cleanFilters.owner_id = parseInt(filters.owner_id);
    if (filters.user_ids && filters.user_ids.length > 0) cleanFilters.user_ids = filters.user_ids;
    if (filters.assignee_ids && filters.assignee_ids.length > 0) cleanFilters.assignee_ids = filters.assignee_ids;
    if (filters.task_status) cleanFilters.task_status = filters.task_status;

    onSearch(cleanFilters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      status: '',
      priority: '',
      date_from: '',
      date_to: '',
      owner_id: '',
      user_ids: [],
      assignee_ids: [],
      task_status: '',
    });
    onSearch({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-700 sm:p-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiFilter size={24} />
            Napredna pretraga
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiTag className="inline mr-1" />
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Svi statusi</option>
              {type === 'projects' ? (
                <>
                  <option value="planning">Planiranje</option>
                  <option value="active">Aktivan</option>
                  <option value="on-hold">Na čekanju</option>
                  <option value="completed">Završen</option>
                  <option value="cancelled">Otkazan</option>
                </>
              ) : (
                <>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                  <option value="completed">Completed</option>
                </>
              )}
            </select>
          </div>

          {/* Priority (only for tasks) */}
          {type === 'tasks' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiFlag className="inline mr-1" />
                Prioritet
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Svi prioriteti</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiCalendar className="inline mr-1" />
                Datum od
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiCalendar className="inline mr-1" />
                Datum do
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Owner (only for projects) */}
          {type === 'projects' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiUser className="inline mr-1" />
                Vlasnik projekta
              </label>
              <select
                value={filters.owner_id}
                onChange={(e) => setFilters({ ...filters, owner_id: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loadingUsers}
              >
                <option value="">Svi vlasnici</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Users in project (only for projects) */}
          {type === 'projects' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiUser className="inline mr-1" />
                Korisnici u projektu
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 p-2">
                {loadingUsers ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Učitavanje...</div>
                ) : users.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih korisnika</div>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.user_ids.includes(user.id)}
                        onChange={() => handleUserToggle(user.id, 'user_ids')}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.name} ({user.email})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Assignees (only for tasks) */}
          {type === 'tasks' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiUser className="inline mr-1" />
                Dodeljeno korisnicima
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 p-2">
                {loadingUsers ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Učitavanje...</div>
                ) : users.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih korisnika</div>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.assignee_ids.includes(user.id)}
                        onChange={() => handleUserToggle(user.id, 'assignee_ids')}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.name} ({user.email})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Task status (only for projects - filter by tasks with specific status) */}
          {type === 'projects' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiTag className="inline mr-1" />
                Status zadataka u projektu
              </label>
              <select
                value={filters.task_status}
                onChange={(e) => setFilters({ ...filters, task_status: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Svi statusi zadataka</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          )}

          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800 sm:flex-row sm:items-center sm:justify-end sm:p-6">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"
            >
              Resetuj
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              <FiSearch size={18} />
              Pretraži
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}









