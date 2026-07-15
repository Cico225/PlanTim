import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Calendar,
  ListTodo,
  X,
  Loader2,
  FileText,
  Users,
  Sparkles,
} from 'lucide-react';
import {
  getOnboardingProcesses,
  getOnboardingTemplates,
  getOnboardingProcess,
  getOnboardingTasks,
  startOnboarding,
  updateOnboardingTask,
  updateOnboardingProcessStatus,
} from '../../../services/hrmService';
import { getEmployees } from '../../../services/hrmService';
import type { HROnboardingProcess, HROnboardingTask, HROnboardingTemplate } from '../../../types/hrm';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { hr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  not_started: {
    label: 'Nije započeto',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: Circle,
  },
  in_progress: {
    label: 'U toku',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
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
  documents: 'Dokumenti',
  it_setup: 'IT postavke',
  equipment: 'Oprema',
  training: 'Obuka',
  default: 'Ostalo',
};

export default function Onboarding() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showDetailId, setShowDetailId] = useState<number | null>(null);
  const [startEmployeeId, setStartEmployeeId] = useState<number | null>(null);
  const [startTemplateId, setStartTemplateId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { data: processesData, isLoading: loadingProcesses } = useQuery({
    queryKey: ['hrm-onboarding', statusFilter],
    queryFn: () =>
      getOnboardingProcesses({
        ...(statusFilter ? { status: statusFilter } : {}),
      }),
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['hrm-onboarding-templates'],
    queryFn: getOnboardingTemplates,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['hrm-employees-active'],
    queryFn: () => getEmployees({ status: 'active' }),
    enabled: showStartModal,
  });

  const processes = processesData?.data ?? [];
  const total = processesData?.total ?? 0;
  const inProgress = processes.filter((p: HROnboardingProcess) => p.status === 'in_progress').length;
  const completed = processes.filter((p: HROnboardingProcess) => p.status === 'completed').length;
  const employees = employeesData?.data ?? [];

  const startMutation = useMutation({
    mutationFn: ({ employeeId, templateId }: { employeeId: number; templateId: number }) =>
      startOnboarding(employeeId, templateId, startDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-dashboard'] });
      setShowStartModal(false);
      setStartEmployeeId(null);
      setStartTemplateId(null);
      toast.success('Onboarding proces je pokrenut');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Greška pri pokretanju onboardinga');
    },
  });

  const handleStartProcess = () => {
    if (!startEmployeeId || !startTemplateId) {
      toast.error('Odaberite zaposlenika i predložak');
      return;
    }
    startMutation.mutate({ employeeId: startEmployeeId, templateId: startTemplateId });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-violet-500" />
            Onboarding
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Prijem novih zaposlenika – predlošci, zadaci i praćenje napretka
          </p>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium shadow-sm transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          Pokreni onboarding
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{templates?.length ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Predložaka</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['', 'in_progress', 'completed', 'cancelled'].map((status) => (
          <button
            key={status || 'all'}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-violet-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {status === '' ? 'Svi' : STATUS_CONFIG[status]?.label ?? status}
          </button>
        ))}
      </div>

      {/* Process list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loadingProcesses ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : processes.length === 0 ? (
          <div className="text-center py-16 px-4">
            <UserPlus className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nema onboarding procesa</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Pokrenite onboarding za novog zaposlenika odabirom predloška i zaposlenika.
            </p>
            <button
              onClick={() => setShowStartModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              <Sparkles className="w-4 h-4" />
              Pokreni onboarding
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {processes.map((process: HROnboardingProcess) => {
              const config = STATUS_CONFIG[process.status] ?? STATUS_CONFIG.not_started;
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
                        {process.template_name ?? 'Predložak'} · Početak:{' '}
                        {process.start_date ? format(parseISO(process.start_date), 'd. M. y.', { locale: hr }) : '–'}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden max-w-[200px]">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all"
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

      {/* Start process modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowStartModal(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pokreni onboarding</h3>
              <button
                onClick={() => setShowStartModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zaposlenik *</label>
                <select
                  value={startEmployeeId ?? ''}
                  onChange={(e) => setStartEmployeeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value="">Odaberi zaposlenika</option>
                  {employees.map((emp: { id: number; name?: string; first_name?: string; last_name?: string }) => (
                    <option key={emp.id} value={emp.id}>
                      {(emp.name ?? [emp.first_name, emp.last_name].filter(Boolean).join(' ')) || `#${emp.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Predložak *</label>
                <select
                  value={startTemplateId ?? ''}
                  onChange={(e) => setStartTemplateId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  disabled={loadingTemplates}
                >
                  <option value="">Odaberi predložak</option>
                  {templates?.map((t: HROnboardingTemplate) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.tasks?.length ? `(${t.tasks.length} zadataka)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Datum početka</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowStartModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Odustani
              </button>
              <button
                onClick={handleStartProcess}
                disabled={startMutation.isPending || !startEmployeeId || !startTemplateId}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Pokreni
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {showDetailId && (
        <OnboardingDetail
          processId={showDetailId}
          onClose={() => setShowDetailId(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['hrm-onboarding'] });
            queryClient.invalidateQueries({ queryKey: ['hrm-dashboard'] });
          }}
        />
      )}
    </div>
  );
}

function OnboardingDetail({
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
    queryKey: ['hrm-onboarding-process', processId],
    queryFn: () => getOnboardingProcess(processId),
  });
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['hrm-onboarding-tasks', processId],
    queryFn: () => getOnboardingTasks(processId),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: Partial<HROnboardingTask> }) =>
      updateOnboardingTask(processId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-onboarding-tasks', processId] });
      queryClient.invalidateQueries({ queryKey: ['hrm-onboarding-process', processId] });
      queryClient.invalidateQueries({ queryKey: ['hrm-onboarding'] });
      onUpdated();
    },
    onError: () => toast.error('Greška pri ažuriranju zadatka'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: HROnboardingProcess['status']) => updateOnboardingProcessStatus(processId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-onboarding-process', processId] });
      queryClient.invalidateQueries({ queryKey: ['hrm-onboarding'] });
      onUpdated();
      toast.success('Status ažuriran');
    },
    onError: () => toast.error('Greška pri ažuriranju statusa'),
  });

  const handleToggleTask = (task: HROnboardingTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTaskMutation.mutate({ taskId: task.id, data: { status: newStatus } });
  };

  if (loadingProcess || !process) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[process.status] ?? STATUS_CONFIG.not_started;
  const StatusIcon = config.icon;
  const canComplete = process.status === 'in_progress' && tasks.some((t: HROnboardingTask) => t.status !== 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {process.employee_name ?? `Zaposlenik #${process.employee_id}`}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
              <span>{process.template_name}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {config.label}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              Početak: {process.start_date ? format(parseISO(process.start_date), 'd. MMM y.', { locale: hr }) : '–'}
            </div>
            {process.target_completion_date && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                Planirano: {format(parseISO(process.target_completion_date), 'd. MMM y.', { locale: hr })}
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">Napredak</span>
              <span className="text-gray-500 dark:text-gray-400">{process.progress_percentage}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all"
                style={{ width: `${process.progress_percentage}%` }}
              />
            </div>
          </div>

          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-violet-500" />
            Zadaci
          </h4>

          {loadingTasks ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task: HROnboardingTask) => {
                const taskCfg = TASK_STATUS_CONFIG[task.status] ?? TASK_STATUS_CONFIG.pending;
                const categoryLabel = CATEGORY_LABELS[task.category] ?? task.category ?? CATEGORY_LABELS.default;
                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20"
                  >
                    <button
                      onClick={() => process.status === 'in_progress' && handleToggleTask(task)}
                      disabled={process.status !== 'in_progress'}
                      className="flex-shrink-0 mt-0.5 rounded-full p-0.5 focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                      title={task.status === 'completed' ? 'Odznači' : 'Označi završenim'}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {task.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{categoryLabel}</span>
                        {task.responsible_name && (
                          <span className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Users className="w-3.5 h-3.5" />
                            {task.responsible_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Rok: {format(parseISO(task.due_date), 'd. M. y.', { locale: hr })}
                          </span>
                        )}
                        <span className={`text-xs font-medium ${taskCfg.color}`}>{taskCfg.label}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {process.status === 'in_progress' && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => statusMutation.mutate('completed')}
                disabled={statusMutation.isPending || canComplete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Označi kao završeno
              </button>
              <button
                onClick={() => window.confirm('Otkazati ovaj onboarding?') && statusMutation.mutate('cancelled')}
                disabled={statusMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Otkaži
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
