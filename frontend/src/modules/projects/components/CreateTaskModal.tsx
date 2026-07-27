import { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiUser, FiFlag, FiTag } from 'react-icons/fi';
import { projectsService, Task } from '@/services/projectsService';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number; // Optional - if not provided, it's a personal task
  onTaskCreated: () => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  projectId,
  onTaskCreated,
}: CreateTaskModalProps) {
  const isPersonalTask = projectId === undefined;
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState<'personal' | 'assigned'>(isPersonalTask ? 'personal' : 'assigned');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: undefined as number | undefined,
    assignee_ids: [] as number[],
    due_date: '',
    start_date: '',
    estimated_hours: '',
  });
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assigned_to: undefined,
        assignee_ids: [],
        due_date: '',
        start_date: '',
        estimated_hours: '',
      });
      setTaskType(isPersonalTask ? 'personal' : 'assigned');
    }
  }, [isOpen, projectId, isPersonalTask]);

  const fetchUsers = async () => {
    try {
      const response = await apiService.get('/chat/users');
      setUsers(response || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Greška pri učitavanju korisnika');
    }
  };

  const handleAssigneeToggle = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter((id) => id !== userId)
        : [...prev.assignee_ids, userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Naslov taska je obavezan');
      return;
    }

    try {
      setLoading(true);

      const taskData: Partial<Task> & {
        assignee_ids?: number[];
        start_date?: string;
      } = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        start_date: formData.start_date || undefined,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      };

      // Handle assignees based on task type
      if (isPersonalTask) {
        if (taskType === 'assigned' && formData.assignee_ids.length > 0) {
          taskData.assignee_ids = formData.assignee_ids;
        }
        // If personal task with no assignees, it will be assigned to creator by backend
        await projectsService.createPersonalTask(taskData);
      } else {
        // Project task
        if (formData.assignee_ids.length > 0) {
          taskData.assignee_ids = formData.assignee_ids;
        } else if (formData.assigned_to) {
          taskData.assigned_to = formData.assigned_to;
        }
        await projectsService.createTask(projectId!, taskData);
      }

      toast.success('Task uspješno kreiran');
      onTaskCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.response?.data?.message || 'Greška pri kreiranju taska');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-700 sm:p-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {isPersonalTask ? 'Kreiraj lični zadatak' : 'Kreiraj novi task'}
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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Naslov <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Naziv taska..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Detaljan opis taska..."
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiTag className="inline mr-1" />
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiFlag className="inline mr-1" />
                Prioritet
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Task Type (for personal tasks) */}
          {isPersonalTask && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tip zadatka
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taskType"
                    value="personal"
                    checked={taskType === 'personal'}
                    onChange={(e) => setTaskType(e.target.value as 'personal' | 'assigned')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Lični zadatak (samo za mene)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="taskType"
                    value="assigned"
                    checked={taskType === 'assigned'}
                    onChange={(e) => setTaskType(e.target.value as 'personal' | 'assigned')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Dodeljeno korisniku/korisnicima</span>
                </label>
              </div>
            </div>
          )}

          {/* Assignees - Multiple selection */}
          {(isPersonalTask && taskType === 'assigned') || !isPersonalTask ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiUser className="inline mr-1" />
                Dodeljeno korisnicima
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 p-3">
                {users.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih korisnika</div>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assignee_ids.includes(user.id)}
                        onChange={() => handleAssigneeToggle(user.id)}
                        disabled={loading}
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
          ) : null}

          {/* Single assignee fallback (for project tasks without multiple assignees) */}
          {!isPersonalTask && formData.assignee_ids.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiUser className="inline mr-1" />
                Dodeljeno korisniku (alternativa)
              </label>
              <select
                value={formData.assigned_to || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assigned_to: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Nije dodeljeno</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates and Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiCalendar className="inline mr-1" />
                Datum početka
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FiCalendar className="inline mr-1" />
                Rok završetka
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Procijenjeni sati
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.0"
              />
            </div>
          </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800 sm:flex-row sm:items-center sm:justify-end sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim()}
              className="px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Kreiranje...' : 'Kreiraj task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


