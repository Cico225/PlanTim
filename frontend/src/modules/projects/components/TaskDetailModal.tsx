import { useEffect, useRef, useState } from 'react';
import {
  FiX,
  FiSave,
  FiTrash2,
  FiMessageSquare,
  FiPaperclip,
  FiDownload,
  FiUpload,
  FiCalendar,
  FiFlag,
  FiActivity,
} from 'react-icons/fi';
import { projectsService, Task } from '@/services/projectsService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  taskId: number;
  canManage?: boolean;
  onTaskUpdated: () => void;
  onTaskDeleted?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Za uraditi' },
  { value: 'in-progress', label: 'U toku' },
  { value: 'review', label: 'Pregled' },
  { value: 'done', label: 'Završeno' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Nizak' },
  { value: 'medium', label: 'Srednji' },
  { value: 'high', label: 'Visok' },
  { value: 'urgent', label: 'Hitno' },
];

const STATUS_STYLE: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'in-progress': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-blue-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

export default function TaskDetailModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  canManage = false,
  onTaskUpdated,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
  });
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
      fetchComments();
      fetchAttachments();
    }
  }, [isOpen, taskId]);

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
      toast.error('Greška pri učitavanju zadatka');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setComments(await projectsService.getTaskComments(projectId, taskId));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      setAttachments(await projectsService.getTaskAttachments(projectId, taskId));
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (!formData.title.trim()) {
      toast.error('Naslov zadatka je obavezan');
      return;
    }

    try {
      setSaving(true);
      await projectsService.updateTask(projectId, taskId, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || undefined,
        estimated_hours: formData.estimated_hours
          ? parseFloat(formData.estimated_hours)
          : undefined,
      });
      toast.success('Zadatak sačuvan');
      await fetchTask();
      onTaskUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri čuvanju zadatka');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage) return;
    if (!confirm('Da li ste sigurni da želite obrisati ovaj zadatak?')) return;

    try {
      setSaving(true);
      await projectsService.deleteTask(projectId, taskId);
      toast.success('Zadatak obrisan');
      onClose();
      onTaskDeleted?.();
      onTaskUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju zadatka');
    } finally {
      setSaving(false);
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
      toast.error(error.response?.data?.message || 'Greška pri dodavanju komentara');
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
      toast.success('Prilog dodan');
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
    if (!canManage) return;
    if (!confirm(`Obrisati prilog "${fileName}"?`)) return;
    try {
      await projectsService.deleteTaskAttachment(projectId, taskId, attachmentId);
      toast.success('Prilog obrisan');
      await fetchAttachments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju priloga');
    }
  };

  if (!isOpen) return null;

  if (loading && !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8 dark:bg-dark-800">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (!task) return null;

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-dark-600 dark:bg-dark-700 dark:text-white dark:focus:ring-primary-900/40 dark:disabled:bg-dark-900';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 dark:border-dark-700 dark:from-dark-900 dark:to-dark-800 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[formData.status] || STATUS_STYLE.todo}`}
                >
                  {STATUS_OPTIONS.find((s) => s.value === formData.status)?.label || formData.status}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span
                    className={`h-2 w-2 rounded-full ${PRIORITY_DOT[formData.priority] || PRIORITY_DOT.medium}`}
                  />
                  {PRIORITY_OPTIONS.find((p) => p.value === formData.priority)?.label}
                </span>
                {!canManage && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500 dark:bg-dark-700 dark:text-gray-400">
                    Samo pregled
                  </span>
                )}
              </div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={!canManage}
                className="w-full border-0 bg-transparent text-xl font-bold text-gray-900 outline-none placeholder:text-gray-400 disabled:cursor-default dark:text-white sm:text-2xl"
                placeholder="Naslov zadatka..."
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-gray-200"
            >
              <FiX size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          <section>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!canManage}
              rows={4}
              placeholder="Opis zadatka..."
              className={inputClass}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field icon={<FiActivity size={14} />} label="Status">
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={!canManage}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field icon={<FiFlag size={14} />} label="Prioritet">
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                disabled={!canManage}
                className={inputClass}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field icon={<FiCalendar size={14} />} label="Rok">
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                disabled={!canManage}
                className={inputClass}
              />
            </Field>
            <Field icon={<FiActivity size={14} />} label="Procijenjeni sati">
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                disabled={!canManage}
                placeholder="npr. 4"
                className={inputClass}
              />
            </Field>
          </section>

          {(task.assignees?.length || task.assigned_to_name) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dodijeljeno:{' '}
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {task.assignees?.length
                  ? task.assignees.map((a) => a.user_name).join(', ')
                  : task.assigned_to_name}
              </span>
            </p>
          )}

          {/* Comments */}
          <section className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-dark-600 dark:bg-dark-900/40">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <FiMessageSquare className="text-primary-500" />
              Komentari ({comments.length})
            </h3>
            <div className="mb-3 space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                placeholder="Napišite komentar..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
              >
                Dodaj komentar
              </button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-gray-100 bg-white p-3 dark:border-dark-600 dark:bg-dark-800"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {comment.user_name}
                    </span>
                    <span>
                      {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {comment.comment}
                  </p>
                </div>
              ))}
              {!comments.length && (
                <p className="py-2 text-center text-sm text-gray-400">Još nema komentara</p>
              )}
            </div>
          </section>

          {/* Attachments */}
          <section className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-dark-600 dark:bg-dark-900/40">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <FiPaperclip className="text-primary-500" />
                Prilozi ({attachments.length})
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUploadAttachment}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50 dark:bg-dark-700 dark:text-gray-200 dark:ring-dark-600"
                >
                  <FiUpload size={14} />
                  {uploadingAttachment ? 'Upload...' : 'Dodaj'}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-dark-600 dark:bg-dark-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-800 dark:text-gray-200">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(attachment.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      projectsService.downloadTaskAttachment(
                        projectId,
                        taskId,
                        attachment.id,
                        attachment.file_name
                      )
                    }
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700"
                  >
                    <FiDownload size={16} />
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteAttachment(attachment.id, attachment.file_name)
                      }
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              {!attachments.length && (
                <p className="py-2 text-center text-sm text-gray-400">Nema priloga</p>
              )}
            </div>
          </section>
        </div>

        {/* Footer actions */}
        {canManage && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-white px-4 py-3 dark:border-dark-700 dark:bg-dark-800 sm:px-6">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
            >
              <FiTrash2 size={16} />
              Obriši
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <FiSave size={16} />
              {saving ? 'Čuvanje...' : 'Sačuvaj izmjene'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
