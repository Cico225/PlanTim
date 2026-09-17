import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserMinus,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  ListTodo,
  X,
  Loader2,
  Sparkles,
  Ban,
  RotateCcw,
} from 'lucide-react';
import {
  getOffboardingProcesses,
  getOffboardingReasons,
  getOffboardingChecklistItems,
  getOffboardingProcess,
  getOffboardingTasks,
  initiateOffboarding,
  updateOffboardingTask,
  completeOffboarding,
  updateOffboardingProcessStatus,
  getEmployees,
} from '../../../services/hrmService';
import type {
  HROffboardingProcess,
  HROffboardingTask,
  HROffboardingReason,
} from '../../../types/hrm';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/dateFormat';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  initiated: {
    label: 'Pokrenuto',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: Circle,
  },
  in_progress: {
    label: 'U toku',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    icon: Clock,
  },
  completed: {
    label: 'Završeno',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Otkazano',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Na čekanju', color: 'text-gray-500 dark:text-gray-400' },
  in_progress: { label: 'U toku', color: 'text-blue-600 dark:text-blue-400' },
  completed: { label: 'Završeno', color: 'text-green-600 dark:text-green-400' },
  skipped: { label: 'Preskočeno', color: 'text-amber-600 dark:text-amber-400' },
};

const CATEGORY_LABELS: Record<string, string> = {
  equipment: 'Oprema',
  it_access: 'IT pristup',
  exit_interview: 'Exit intervju',
  documents: 'Dokumenti',
  payroll: 'Obračun',
  archive: 'Arhiva',
  default: 'Ostalo',
};

type ChecklistItem = {
  id: number;
  name: string;
  title?: string;
  description?: string;
  category: string;
  due_days: number;
  is_required: boolean;
};

export default function Offboarding() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showDetailId, setShowDetailId] = useState<number | null>(null);

  const { data: processesData, isLoading: loadingProcesses } = useQuery({
    queryKey: ['hrm-offboarding', statusFilter],
    queryFn: () =>
      getOffboardingProcesses({
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
  });

  const processes = processesData?.data ?? [];
  const total = processesData?.total ?? 0;
  const inProgress = processes.filter(
    (p: HROffboardingProcess) => p.status === 'in_progress' || p.status === 'initiated'
  ).length;
  const completed = processes.filter((p: HROffboardingProcess) => p.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserMinus className="w-7 h-7 text-orange-500" />
            Offboarding
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Odaberite zaposlenika, pokrenite proces odlaska i pratite checklistu
          </p>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium shadow-sm transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          Pokreni offboarding
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <ListTodo className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ukupno procesa</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{inProgress}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">U toku</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Završeno</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['', 'in_progress', 'completed', 'cancelled'].map((status) => (
          <button
            key={status || 'all'}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-orange-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {status === '' ? 'Svi' : STATUS_CONFIG[status]?.label ?? status}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loadingProcesses ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : processes.length === 0 ? (
          <div className="text-center py-16 px-4">
            <UserMinus className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nema offboarding procesa</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Prvo odaberite zaposlenika, zatim razlog i zadatke checkliste.
            </p>
            <button
              onClick={() => setShowStartModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Sparkles className="w-4 h-4" />
              Pokreni offboarding
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {processes.map((process: HROffboardingProcess) => {
              const config = STATUS_CONFIG[process.status] ?? STATUS_CONFIG.initiated;
              const StatusIcon = config.icon;
              return (
                <li key={process.id}>
                  <button
                    onClick={() => setShowDetailId(process.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {process.employee_name ?? `Zaposlenik #${process.employee_id}`}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {process.reason_name ?? 'Razlog'} · Zadnji radni dan:{' '}
                        {formatDate(process.last_working_date, '–')}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden max-w-[200px]">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all"
                            style={{ width: `${process.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {process.progress_percentage}%
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showStartModal && (
        <StartOffboardingModal
          onClose={() => setShowStartModal(false)}
          onStarted={(id) => {
            setShowStartModal(false);
            setShowDetailId(id);
            queryClient.invalidateQueries({ queryKey: ['hrm-offboarding'] });
            queryClient.invalidateQueries({ queryKey: ['hrm-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
          }}
        />
      )}

      {showDetailId && (
        <OffboardingDetail
          processId={showDetailId}
          onClose={() => setShowDetailId(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['hrm-offboarding'] });
            queryClient.invalidateQueries({ queryKey: ['hrm-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
          }}
        />
      )}
    </div>
  );
}

function StartOffboardingModal({
  onClose,
  onStarted,
}: {
  onClose: () => void;
  onStarted: (processId: number) => void;
}) {
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [reasonId, setReasonId] = useState<number | null>(null);
  const [lastWorkingDate, setLastWorkingDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ['hrm-employees-for-offboarding'],
    queryFn: () => getEmployees({ status: 'active' }),
  });

  const { data: reasons = [], isLoading: loadingReasons } = useQuery({
    queryKey: ['hrm-offboarding-reasons'],
    queryFn: () => getOffboardingReasons(),
  });

  const { data: checklist = [], isLoading: loadingChecklist } = useQuery({
    queryKey: ['hrm-offboarding-checklist'],
    queryFn: () => getOffboardingChecklistItems(),
  });

  const employees = employeesData?.data ?? [];

  useEffect(() => {
    if (checklist.length > 0 && selectedItemIds.length === 0) {
      setSelectedItemIds(checklist.map((c: ChecklistItem) => c.id));
    }
  }, [checklist, selectedItemIds.length]);

  const startMutation = useMutation({
    mutationFn: () =>
      initiateOffboarding(
        employeeId!,
        reasonId!,
        lastWorkingDate,
        notes || undefined,
        selectedItemIds
      ),
    onSuccess: (process) => {
      toast.success('Offboarding proces je pokrenut');
      onStarted(process.id);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Greška pri pokretanju offboardinga');
    },
  });

  const toggleItem = (id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canSubmit =
    !!employeeId && !!reasonId && !!lastWorkingDate && selectedItemIds.length > 0 && !startMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pokreni offboarding</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              1. Zaposlenik *
            </label>
            <select
              value={employeeId ?? ''}
              onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              disabled={loadingEmployees}
            >
              <option value="">Odaberi zaposlenika</option>
              {employees.map((emp: { id: number; name?: string; first_name?: string; last_name?: string; email?: string }) => (
                <option key={emp.id} value={emp.id}>
                  {(emp.name ?? [emp.first_name, emp.last_name].filter(Boolean).join(' ')) || `#${emp.id}`}
                  {emp.email ? ` (${emp.email})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Prvo odaberite zaposlenika — status će biti postavljen na „offboarding”.
            </p>
          </div>

          <div className={!employeeId ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              2. Razlog odlaska *
            </label>
            <select
              value={reasonId ?? ''}
              onChange={(e) => setReasonId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              disabled={!employeeId || loadingReasons}
            >
              <option value="">Odaberi razlog</option>
              {(reasons as HROffboardingReason[]).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className={!employeeId ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              3. Zadnji radni dan *
            </label>
            <input
              type="date"
              value={lastWorkingDate}
              onChange={(e) => setLastWorkingDate(e.target.value)}
              disabled={!employeeId}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
          </div>

          <div className={!employeeId ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                4. Checklist zadaci *
              </label>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedItemIds(checklist.map((c: ChecklistItem) => c.id))}
                  className="text-orange-600 hover:underline"
                  disabled={!employeeId}
                >
                  Sve
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedItemIds([])}
                  className="text-gray-500 hover:underline"
                  disabled={!employeeId}
                >
                  Ništa
                </button>
              </div>
            </div>
            {loadingChecklist ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              </div>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                {(checklist as ChecklistItem[]).map((item) => {
                  const checked = selectedItemIds.includes(item.id);
                  return (
                    <li key={item.id}>
                      <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.id)}
                          disabled={!employeeId}
                          className="mt-1 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="min-w-0">
                          <span
                            className={`block text-sm font-medium ${
                              checked ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'
                            }`}
                          >
                            {item.name || item.title}
                            {item.is_required && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-orange-600">
                                obavezno
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {CATEGORY_LABELS[item.category] ?? item.category}
                            {item.description ? ` · ${item.description}` : ''}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={!employeeId ? 'opacity-50 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Napomene</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!employeeId}
              placeholder="Opcionalno…"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300">
            Odustani
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (!employeeId) {
                toast.error('Odaberite zaposlenika');
                return;
              }
              if (!reasonId) {
                toast.error('Odaberite razlog odlaska');
                return;
              }
              if (selectedItemIds.length === 0) {
                toast.error('Odaberite barem jedan zadatak');
                return;
              }
              startMutation.mutate();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Pokreni
          </button>
        </div>
      </div>
    </div>
  );
}

function OffboardingDetail({
  processId,
  onClose,
  onUpdated,
}: {
  processId: number;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: process, isLoading: loadingProcess } = useQuery({
    queryKey: ['hrm-offboarding-process', processId],
    queryFn: () => getOffboardingProcess(processId),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['hrm-offboarding-tasks', processId],
    queryFn: () => getOffboardingTasks(processId),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: Partial<HROffboardingTask> }) =>
      updateOffboardingTask(processId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-offboarding-tasks', processId] });
      queryClient.invalidateQueries({ queryKey: ['hrm-offboarding-process', processId] });
      onUpdated();
    },
    onError: () => toast.error('Greška pri ažuriranju zadatka'),
  });

  const completeMutation = useMutation({
    mutationFn: (force: boolean) => completeOffboarding(processId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-offboarding-process', processId] });
      onUpdated();
      toast.success('Offboarding je završen — zaposlenik je označen kao bivši');
    },
    onError: (err: any) => {
      const pending = err.response?.data?.pending_tasks;
      if (pending) {
        if (window.confirm(`${err.response?.data?.message}\n\nŽelite li ipak završiti i preskočiti preostale zadatke?`)) {
          completeMutation.mutate(true);
        }
        return;
      }
      toast.error(err.response?.data?.message || 'Greška pri završetku');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => updateOffboardingProcessStatus(processId, 'cancelled'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-offboarding-process', processId] });
      onUpdated();
      toast.success('Offboarding je otkazan');
    },
    onError: () => toast.error('Greška pri otkazivanju'),
  });

  const handleToggleTask = (task: HROffboardingTask) => {
    if (task.status === 'skipped' || process?.status === 'completed' || process?.status === 'cancelled') return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTaskMutation.mutate({ taskId: task.id, data: { status: newStatus } });
  };

  const handleSkipTask = (task: HROffboardingTask) => {
    updateTaskMutation.mutate({ taskId: task.id, data: { status: 'skipped' } });
  };

  const handleRestoreTask = (task: HROffboardingTask) => {
    updateTaskMutation.mutate({ taskId: task.id, data: { status: 'pending' } });
  };

  if (loadingProcess || !process) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const config = STATUS_CONFIG[process.status] ?? STATUS_CONFIG.initiated;
  const isClosed = process.status === 'completed' || process.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-start justify-between gap-3 z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {process.employee_name ?? `Zaposlenik #${process.employee_id}`}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {process.reason_name} · Zadnji radni dan: {formatDate(process.last_working_date, '–')}
            </p>
            <span className={`inline-flex mt-2 items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
              {config.label} · {process.progress_percentage}%
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {process.notes && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 text-sm text-gray-700 dark:text-gray-300">
              {process.notes}
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Checklist</h4>
            {loadingTasks ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-gray-500">Nema zadataka.</p>
            ) : (
              <ul className="space-y-2">
                {(tasks as HROffboardingTask[]).map((task) => {
                  const taskCfg = TASK_STATUS_CONFIG[task.status] ?? TASK_STATUS_CONFIG.pending;
                  const done = task.status === 'completed';
                  const skipped = task.status === 'skipped';
                  return (
                    <li
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        skipped
                          ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10'
                          : done
                            ? 'border-green-200 dark:border-green-900/40 bg-green-50/40 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isClosed || skipped}
                        onClick={() => handleToggleTask(task)}
                        className="mt-0.5 disabled:opacity-50"
                        title={done ? 'Vrati na čekanje' : 'Označi kao završeno'}
                      >
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : skipped ? (
                          <Ban className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            skipped || done
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-gray-900 dark:text-white'
                          } ${skipped ? 'line-through' : ''}`}
                        >
                          {task.name}
                        </p>
                        {task.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{task.description}</p>
                        )}
                        <p className={`text-xs mt-1 ${taskCfg.color}`}>
                          {CATEGORY_LABELS[task.category] ?? task.category}
                          {task.due_date ? ` · Rok: ${formatDate(task.due_date, '–')}` : ''}
                          {` · ${taskCfg.label}`}
                        </p>
                      </div>
                      {!isClosed && (
                        <div className="flex flex-col gap-1">
                          {skipped ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreTask(task)}
                              className="text-xs text-gray-500 hover:text-orange-600 inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Vrati
                            </button>
                          ) : !done ? (
                            <button
                              type="button"
                              onClick={() => handleSkipTask(task)}
                              className="text-xs text-gray-500 hover:text-amber-600"
                            >
                              Preskoči
                            </button>
                          ) : null}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {!isClosed && (
          <div className="flex flex-wrap justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Otkazati offboarding? Zaposlenik će biti vraćen na aktivan status.')) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži proces
            </button>
            <button
              type="button"
              onClick={() => completeMutation.mutate(false)}
              disabled={completeMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {completeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Završi offboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
