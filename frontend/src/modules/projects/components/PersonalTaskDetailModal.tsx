import { useState, useEffect } from 'react';
import { FiX, FiCalendar, FiFlag, FiTag, FiSave, FiTrash2, FiEdit2, FiUser } from 'react-icons/fi';
import { projectsService, Task } from '@/services/projectsService';
import toast from 'react-hot-toast';

interface PersonalTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  onTaskUpdated: () => void;
  onTaskDeleted?: () => void;
}

export default function PersonalTaskDetailModal({
  isOpen,
  onClose,
  taskId,
  onTaskUpdated,
  onTaskDeleted,
}: PersonalTaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    start_date: '',
    estimated_hours: '',
  });

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
    }
  }, [isOpen, taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const tasks = await projectsService.getPersonalTasks();
      const foundTask = tasks.find((t) => t.id === taskId);
      if (foundTask) {
        setTask(foundTask);
        setFormData({
          title: foundTask.title || '',
          description: foundTask.description || '',
          status: foundTask.status || 'todo',
          priority: foundTask.priority || 'medium',
          due_date: foundTask.due_date ? foundTask.due_date.split('T')[0] : '',
          start_date: (foundTask as any).start_date ? ((foundTask as any).start_date as string).split('T')[0] : '',
          estimated_hours: foundTask.estimated_hours?.toString() || '',
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Greška pri učitavanju zadatka');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Naslov zadatka je obavezan');
      return;
    }

    try {
      setLoading(true);
      const updateData: Partial<Task> & { start_date?: string } = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date && formData.due_date.trim() ? formData.due_date.trim() : null,
        start_date: formData.start_date && formData.start_date.trim() ? formData.start_date.trim() : null,
        estimated_hours: formData.estimated_hours && formData.estimated_hours.trim() ? parseFloat(formData.estimated_hours) : null,
      };

      console.log('Updating personal task with data:', updateData);
      const response = await projectsService.updatePersonalTask(taskId, updateData);
      console.log('Update response:', response);
      toast.success('Zadatak uspješno ažuriran');
      setIsEditing(false);
      await fetchTask();
      onTaskUpdated();
    } catch (error: any) {
      console.error('Error updating task:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors || 'Greška pri ažuriranju zadatka';
      toast.error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj zadatak?')) {
      return;
    }

    try {
      setLoading(true);
      await projectsService.deletePersonalTask(taskId);
      toast.success('Zadatak uspješno obrisan');
      onClose();
      if (onTaskDeleted) {
        onTaskDeleted();
      }
      onTaskUpdated();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.message || 'Greška pri brisanju zadatka');
    } finally {
      setLoading(false);
    }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-700 sm:p-6">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Uredi zadatak' : 'Detalji zadatka'}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors"
                  title="Uredi"
                >
                  <FiEdit2 size={20} />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                  title="Obriši"
                >
                  <FiTrash2 size={20} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && !task ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : task ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Naslov <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                />
              ) : (
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{task.title}</h3>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Opis
              </label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  disabled={loading}
                />
              ) : (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {task.description || 'Bez opisa'}
                </p>
              )}
            </div>

            {/* Status and Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiTag className="inline mr-1" />
                  Status
                </label>
                {isEditing ? (
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                ) : (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiFlag className="inline mr-1" />
                  Prioritet
                </label>
                {isEditing ? (
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <FiFlag className={getPriorityColor(task.priority)} size={18} />
                    <span className="text-gray-700 dark:text-gray-300 capitalize">{task.priority}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator and Assignee Info */}
            {!isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                {(task as any).created_by_name && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Vlasnik / Kreirao
                    </label>
                    <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <FiUser size={16} />
                      <span>{(task as any).created_by_name}</span>
                    </div>
                  </div>
                )}
                {((task.assignees && task.assignees.length > 0) || (task as any).assigned_to_name) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Izvršilac
                    </label>
                    <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                      <FiUser size={16} />
                      <span>
                        {task.assignees && task.assignees.length > 0
                          ? task.assignees.map((a: any) => a.user_name || a.name).join(', ')
                          : (task as any).assigned_to_name || 'Nije dodeljen'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dates and Estimated Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiCalendar className="inline mr-1" />
                  Datum početka
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {(task as any).start_date ? new Date((task as any).start_date).toLocaleDateString('bs-BA') : '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FiCalendar className="inline mr-1" />
                  Rok završetka
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={loading}
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('bs-BA') : '-'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Procijenjeni sati
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0.0"
                    disabled={loading}
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                    {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors disabled:opacity-50"
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !formData.title.trim()}
                  className="px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Čuvanje...
                    </>
                  ) : (
                    <>
                      <FiSave size={18} />
                      Sačuvaj
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

