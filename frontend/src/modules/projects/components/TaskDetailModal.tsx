import { useState, useEffect, useRef } from 'react';
import { FiX, FiCalendar, FiUser, FiFlag, FiMessageSquare, FiPaperclip, FiEdit2, FiSave, FiTrash2, FiPlay, FiSquare, FiClock, FiPlus, FiDownload, FiUpload } from 'react-icons/fi';
import { projectsService, Task } from '@/services/projectsService';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { sr } from 'date-fns/locale';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId: number;
  onTaskUpdated: () => void;
  onTaskDeleted?: () => void;
}

export default function TaskDetailModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    due_date: '',
    estimated_hours: '',
  });
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [totalTime, setTotalTime] = useState({ minutes: 0, hours: 0 });
  const [activeTimer, setActiveTimer] = useState<any | null>(null);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [currentTimerSeconds, setCurrentTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
      fetchComments();
      fetchAttachments();
      fetchTimeEntries();
      checkActiveTimer();
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isOpen, taskId]);

  // Timer interval for active timer
  useEffect(() => {
    if (activeTimer && activeTimer.is_running) {
      timerIntervalRef.current = setInterval(() => {
        if (activeTimer.started_at) {
          const startTime = new Date(activeTimer.started_at).getTime();
          const now = Date.now();
          const seconds = Math.floor((now - startTime) / 1000);
          setCurrentTimerSeconds(seconds);
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeTimer]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const tasks = await projectsService.getTasks(projectId);
      const foundTask = tasks.find((t) => t.id === taskId);
      if (foundTask) {
        setTask(foundTask);
        setFormData({
          title: foundTask.title || '',
          description: foundTask.description || '',
          status: foundTask.status || 'todo',
          priority: foundTask.priority || 'medium',
          due_date: foundTask.due_date ? foundTask.due_date.split('T')[0] : '',
          estimated_hours: foundTask.estimated_hours?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      toast.error('Greška pri učitavanju taska');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const commentsData = await projectsService.getTaskComments(projectId, taskId);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const attachmentsData = await projectsService.getTaskAttachments(projectId, taskId);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const data = await projectsService.getTaskTimeTracking(projectId, taskId);
      setTimeEntries(data.entries || []);
      setTotalTime({
        minutes: data.total_minutes || 0,
        hours: data.total_hours || 0,
      });
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const checkActiveTimer = async () => {
    try {
      const timer = await projectsService.getActiveTimer();
      if (timer && timer.task_id === taskId) {
        setActiveTimer(timer);
        if (timer.current_duration_seconds) {
          setCurrentTimerSeconds(timer.current_duration_seconds);
        }
      } else {
        setActiveTimer(null);
        setCurrentTimerSeconds(0);
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
    }
  };

  const handleStartTimer = async () => {
    try {
      await projectsService.startTimeTracking(projectId, taskId);
      toast.success('Timer pokrenut');
      await checkActiveTimer();
      await fetchTimeEntries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri pokretanju timera');
    }
  };

  const handleStopTimer = async () => {
    try {
      await projectsService.stopTimeTracking(projectId, taskId);
      toast.success('Timer zaustavljen');
      setActiveTimer(null);
      setCurrentTimerSeconds(0);
      await fetchTimeEntries();
      await fetchTask(); // Refresh task to update actual_hours
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri zaustavljanju timera');
    }
  };

  const handleDeleteTimeEntry = async (entryId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj time entry?')) {
      return;
    }

    try {
      await projectsService.deleteTimeEntry(projectId, taskId, entryId);
      toast.success('Time entry obrisan');
      await fetchTimeEntries();
      await fetchTask();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju time entry-ja');
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datoteka može biti najviše 10 MB');
      e.target.value = '';
      return;
    }
    try {
      setUploadingAttachment(true);
      await projectsService.uploadTaskAttachment(projectId, taskId, file);
      toast.success('Prilog uspješno dodan');
      await fetchAttachments();
      e.target.value = '';
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri dodavanju priloga');
      e.target.value = '';
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number, fileName: string) => {
    if (!confirm(`Da li ste sigurni da želite obrisati prilog "${fileName}"?`)) return;
    try {
      await projectsService.deleteTaskAttachment(projectId, taskId, attachmentId);
      toast.success('Prilog obrisan');
      await fetchAttachments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju priloga');
    }
  };

  const formatTimeDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatDurationFromSeconds = (seconds: number | null) => {
    if (!seconds) return '-';
    return formatTimeDuration(seconds);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Naslov taska je obavezan');
      return;
    }

    try {
      setLoading(true);
      const updateData: Partial<Task> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      };

      await projectsService.updateTask(projectId, taskId, updateData);
      toast.success('Task uspješno ažuriran');
      setIsEditing(false);
      await fetchTask();
      onTaskUpdated();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error(error.response?.data?.message || 'Greška pri ažuriranju taska');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj task?')) {
      return;
    }

    try {
      setLoading(true);
      await projectsService.deleteTask(projectId, taskId);
      toast.success('Task uspješno obrisan');
      onClose();
      if (onTaskDeleted) {
        onTaskDeleted();
      }
      onTaskUpdated();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.response?.data?.message || 'Greška pri brisanju taska');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await projectsService.createTaskComment(projectId, taskId, newComment);
      toast.success('Komentar dodat');
      setNewComment('');
      await fetchComments();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.message || 'Greška pri dodavanju komentara');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!isOpen) return null;

  if (loading && !task) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 p-4 dark:border-dark-700 sm:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="min-w-0 flex-1 border-b-2 border-primary-500 bg-transparent text-lg font-bold text-gray-900 focus:outline-none dark:text-white sm:text-2xl"
                placeholder="Naslov taska..."
                autoFocus
              />
            ) : (
              <h2 className="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-2xl">{task.title}</h2>
            )}
            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
            <span
              className={`inline-block w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}
              title={task.priority}
            />
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      title: task.title || '',
                      description: task.description || '',
                      status: task.status || 'todo',
                      priority: task.priority || 'medium',
                      due_date: task.due_date ? task.due_date.split('T')[0] : '',
                      estimated_hours: task.estimated_hours?.toString() || '',
                    });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <FiX size={20} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="p-2 text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                >
                  <FiSave size={20} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <FiEdit2 size={20} />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <FiTrash2 size={20} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-6 sm:p-6">
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {task.description || 'Bez opisa'}
              </p>
            )}
          </div>

          {/* Task Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
              {isEditing ? (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{task.status}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prioritet</label>
              {isEditing ? (
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{task.priority}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Rok</label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">
                  {task.due_date
                    ? format(new Date(task.due_date), 'dd.MM.yyyy', { locale: sr })
                    : 'Nema roka'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Procijenjeni sati</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">
                  {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
                </p>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiMessageSquare />
              Komentari ({comments.length})
            </h3>

            {/* Add Comment */}
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Dodaj komentar..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Dodaj komentar
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {comment.user_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Time Tracking Section */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiClock />
                Praćenje vrijemena
              </h3>
              <div className="flex items-center gap-2">
                {activeTimer ? (
                  <button
                    onClick={handleStopTimer}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <FiSquare size={16} />
                    Zaustavi ({formatTimeDuration(currentTimerSeconds)})
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleStartTimer}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <FiPlay size={16} />
                      Pokreni timer
                    </button>
                    <button
                      onClick={() => setShowTimeEntryModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <FiPlus size={16} />
                      Dodaj vrijeme
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Total Time */}
            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ukupno vrijeme:
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {totalTime.hours.toFixed(2)}h ({totalTime.minutes.toFixed(0)} min)
                </span>
              </div>
            </div>

            {/* Time Entries List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {timeEntries.length > 0 ? (
                timeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 rounded-lg p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.user_name}
                        </span>
                        {entry.is_running && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded">
                            Aktivan
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.started_at).toLocaleString('sr-RS')}
                        {entry.ended_at && ` - ${new Date(entry.ended_at).toLocaleString('sr-RS')}`}
                      </div>
                      {entry.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {entry.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDurationFromSeconds(entry.duration)}
                      </span>
                      <button
                        onClick={() => handleDeleteTimeEntry(entry.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  Nema unosa vrijemena
                </p>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiPaperclip />
                Prilozi ({attachments.length})
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUploadAttachment}
                  accept="*/*"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <FiUpload size={16} />
                  {uploadingAttachment ? 'Učitavanje...' : 'Dodaj prilog'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Maksimalna veličina datoteke: 10 MB</p>
            {attachments.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 rounded-lg p-3 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate block">
                        {attachment.file_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {(attachment.file_size / 1024).toFixed(2)} KB
                        {attachment.uploaded_by_name && ` • ${attachment.uploaded_by_name}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => projectsService.downloadTaskAttachment(projectId, taskId, attachment.id, attachment.file_name)}
                        className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        title="Preuzmi"
                      >
                        <FiDownload size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(attachment.id, attachment.file_name)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        title="Obriši prilog"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nema priloga. Kliknite „Dodaj prilog” za upload datoteke.</p>
            )}
          </div>
        </div>
      </div>

      {/* Manual Time Entry Modal */}
      {showTimeEntryModal && (
        <ManualTimeEntryModal
          isOpen={showTimeEntryModal}
          onClose={() => setShowTimeEntryModal(false)}
          projectId={projectId}
          taskId={taskId}
          onEntryAdded={() => {
            setShowTimeEntryModal(false);
            fetchTimeEntries();
            fetchTask();
          }}
        />
      )}
    </div>
  );
}

// Manual Time Entry Modal
function ManualTimeEntryModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  onEntryAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId: number;
  onEntryAdded: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    duration_minutes: '',
    started_at: new Date().toISOString().slice(0, 16),
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.duration_minutes || parseFloat(formData.duration_minutes) <= 0) {
      toast.error('Trajanje mora biti veće od 0');
      return;
    }

    try {
      setLoading(true);
      await projectsService.addManualTimeEntry(projectId, taskId, {
        duration_minutes: parseFloat(formData.duration_minutes),
        started_at: formData.started_at || undefined,
        description: formData.description || undefined,
      });
      toast.success('Vreme uspješno dodato');
      onEntryAdded();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri dodavanju vrijemena');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dodaj vrijeme</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trajanje (minuti) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="60"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Datum i vrijeme početka
            </label>
            <input
              type="datetime-local"
              value={formData.started_at}
              onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Opis rada..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Dodavanje...' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

