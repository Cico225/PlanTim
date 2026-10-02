import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Edit,
  ListTodo,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import { getStores } from '@/services/hrmService';
import {
  createControlPlan,
  createPlanItem,
  deleteControlPlan,
  deletePlanItem,
  getControlPlan,
  getControlPlans,
  getPlanItems,
  updateControlPlan,
  updatePlanItem,
  type ControlPlan,
  type ControlPlanItem,
  type ControlPlanItemInput,
  type ControlPlanStatus,
  type ControlPlanType,
} from '@/services/retailControlPlansService';
import { useAuthStore } from '@/store/authStore';
import { formatDate, toApiDate } from '@/utils/dateFormat';

const TYPE_LABELS: Record<ControlPlanType, string> = {
  inventory_required: 'Obavezna inventura',
  inventory_extraordinary: 'Vanredna inventura',
  store_visit: 'Obilazak prodavnice',
};

const STATUS_CONFIG: Record<
  ControlPlanStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  draft: {
    label: 'Nacrt',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: Circle,
  },
  active: {
    label: 'Aktivan',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    icon: Clock,
  },
  completed: {
    label: 'Završen',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Otkazan',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
};

type DraftActivity = {
  key: string;
  store_id: string;
  planned_date: string;
  assigned_to: string;
  notes: string;
};

function todayApi() {
  return new Date().toISOString().slice(0, 10);
}

export default function ControlPlansTab() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ControlPlanStatus | ''>('');
  const [search, setSearch] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ControlPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [completeItemId, setCompleteItemId] = useState<number | null>(null);
  const [activityModal, setActivityModal] = useState<
    { mode: 'add' } | { mode: 'edit'; item: ControlPlanItem } | null
  >(null);
  const [completePlanOpen, setCompletePlanOpen] = useState(false);
  const [completeDate, setCompleteDate] = useState(todayApi());

  const filters = useMemo(
    () => ({
      status: (statusFilter || 'all') as ControlPlanStatus | 'all',
      search: search.trim() || undefined,
      per_page: 50,
    }),
    [statusFilter, search]
  );

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['retail-control-plans', filters],
    queryFn: () => getControlPlans(filters),
  });

  const plans = plansData?.data || [];

  const { data: stores } = useQuery({
    queryKey: ['hrm-stores'],
    queryFn: () => getStores({ is_active: true }),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.get<any[]>('/admin/users');
      return response || [];
    },
  });

  const { data: selectedPlan, isLoading: loadingPlan } = useQuery({
    queryKey: ['retail-control-plan', selectedPlanId],
    queryFn: () => getControlPlan(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const { data: planItems = [], isLoading: loadingItems } = useQuery<ControlPlanItem[]>({
    queryKey: ['retail-control-plan-items', selectedPlanId],
    queryFn: async () => {
      const response = await getPlanItems(selectedPlanId!);
      return Array.isArray(response) ? response : ((response as any)?.data || []);
    },
    enabled: !!selectedPlanId,
  });

  const isAdmin =
    user?.role?.toLowerCase() === 'admin' ||
    (user as any)?.roles?.some?.((r: any) => String(r?.name || r).toLowerCase() === 'admin');

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ['retail-control-plans'] });
    await queryClient.invalidateQueries({ queryKey: ['retail-control-plan'] });
    await queryClient.invalidateQueries({ queryKey: ['retail-control-plan-items'] });
    queryClient.invalidateQueries({ queryKey: ['retail-reports-overview'] });
    queryClient.invalidateQueries({ queryKey: ['retail-reports'] });
  };

  const createPlanMutation = useMutation({
    mutationFn: createControlPlan,
    onSuccess: async (plan) => {
      await invalidateAll();
      setShowPlanModal(false);
      setEditingPlan(null);
      toast.success('Plan je uspješno kreiran');
      if (plan?.id) setSelectedPlanId(plan.id);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri kreiranju plana');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ControlPlan> & { created_date?: string } }) =>
      updateControlPlan(id, data),
    onSuccess: async () => {
      await invalidateAll();
      setShowPlanModal(false);
      setEditingPlan(null);
      setCompletePlanOpen(false);
      toast.success('Plan je ažuriran');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju plana');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: deleteControlPlan,
    onSuccess: async () => {
      await invalidateAll();
      setSelectedPlanId(null);
      toast.success('Plan je obrisan');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Greška pri brisanju'),
  });

  const createItemMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: ControlPlanItemInput }) =>
      createPlanItem(planId, data),
    onSuccess: async () => {
      await invalidateAll();
      setActivityModal(null);
      toast.success('Aktivnost je dodata');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Greška pri dodavanju'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      planId,
      itemId,
      data,
    }: {
      planId: number;
      itemId: number;
      data: ControlPlanItemInput;
    }) => updatePlanItem(planId, itemId, data),
    onSuccess: async () => {
      await invalidateAll();
      setCompleteItemId(null);
      setActivityModal(null);
      toast.success('Aktivnost je ažurirana');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Greška pri ažuriranju'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ planId, itemId }: { planId: number; itemId: number }) =>
      deletePlanItem(planId, itemId),
    onSuccess: async () => {
      await invalidateAll();
      toast.success('Aktivnost je obrisana');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Greška pri brisanju'),
  });

  const total = plans.length;
  const activeCount = plans.filter((p) => p.status === 'active').length;
  const completedCount = plans.filter((p) => p.status === 'completed').length;

  if (selectedPlanId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              onClick={() => setSelectedPlanId(null)}
              className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
              Nazad na listu
            </button>
            {loadingPlan || !selectedPlan ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Učitavanje...
              </div>
            ) : (
              <>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                  <ClipboardList className="h-7 w-7 text-teal-500" />
                  {selectedPlan.title}
                </h2>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  {TYPE_LABELS[selectedPlan.type]} · Kreiran{' '}
                  {formatDate(selectedPlan.start_date || selectedPlan.created_at)}
                </p>
              </>
            )}
          </div>
          {selectedPlan && (
            <div className="flex flex-wrap gap-2">
              {(isAdmin || selectedPlan.regional_manager_id === user?.id) && (
                <>
                  <button
                    onClick={() => {
                      setEditingPlan(selectedPlan);
                      setShowPlanModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                    Uredi plan
                  </button>
                  <button
                    onClick={() => setActivityModal({ mode: 'add' })}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj aktivnost
                  </button>
                </>
              )}
              {selectedPlan.status !== 'completed' && (
                <button
                  onClick={() => {
                    setCompleteDate(todayApi());
                    setCompletePlanOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Označi plan urađen
                </button>
              )}
            </div>
          )}
        </div>

        {selectedPlan && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KpiCard
                icon={<ListTodo className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
                iconBg="bg-gray-100 dark:bg-gray-700"
                value={selectedPlan.items_count ?? planItems.length}
                label="Aktivnosti"
              />
              <KpiCard
                icon={<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
                iconBg="bg-green-100 dark:bg-green-900/30"
                value={selectedPlan.completed_items_count ?? planItems.filter((i) => i.status === 'completed').length}
                label="Završeno"
              />
              <KpiCard
                icon={<User className="h-5 w-5 text-teal-600 dark:text-teal-400" />}
                iconBg="bg-teal-100 dark:bg-teal-900/30"
                value={selectedPlan.regional_manager_name || '—'}
                label="Menadžer"
                small
              />
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CONFIG[selectedPlan.status].color}`}
                >
                  {STATUS_CONFIG[selectedPlan.status].label}
                </span>
                {selectedPlan.end_date && selectedPlan.status === 'completed' && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Završen: {formatDate(selectedPlan.end_date)}
                  </p>
                )}
                {selectedPlan.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                    {selectedPlan.description}
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aktivnosti</h3>
                {(isAdmin || selectedPlan.regional_manager_id === user?.id) && (
                  <button
                    type="button"
                    onClick={() => setActivityModal({ mode: 'add' })}
                    className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
                  >
                    + Dodaj aktivnost
                  </button>
                )}
              </div>

              {loadingItems ? (
                <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Učitavanje aktivnosti...
                </div>
              ) : planItems.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Store className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-gray-500 dark:text-gray-400">Još nema aktivnosti u planu.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {planItems.map((item) => {
                    const done = item.status === 'completed';
                    const assignedToMe = item.assigned_to === user?.id;
                    return (
                      <li
                        key={item.id}
                        className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
                          done
                            ? 'bg-green-50/50 dark:bg-green-900/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/40'
                        }`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (done) {
                                updateItemMutation.mutate({
                                  planId: selectedPlan.id,
                                  itemId: item.id,
                                  data: { status: 'pending', completed_date: undefined },
                                });
                              } else {
                                setCompleteDate(item.completed_date || todayApi());
                                setCompleteItemId(item.id);
                              }
                            }}
                            className="mt-0.5 shrink-0"
                            title={done ? 'Vrati na čekanje' : 'Označi kao urađeno'}
                          >
                            {done ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <Circle className="h-6 w-6 text-gray-400 hover:text-teal-500" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`font-medium text-gray-900 dark:text-white ${
                                done ? 'line-through opacity-70' : ''
                              }`}
                            >
                              {item.store_name}
                              {item.store_code ? ` (${item.store_code})` : ''}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="inline-flex items-center gap-1">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                Planirano: {formatDate(item.planned_date)}
                              </span>
                              {item.assigned_to_name && (
                                <span className="inline-flex items-center gap-1">
                                  <User className="h-3.5 w-3.5" />
                                  {item.assigned_to_name}
                                  {assignedToMe ? ' (vi)' : ''}
                                </span>
                              )}
                              {done && item.completed_date && (
                                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                  Urađeno: {formatDate(item.completed_date)}
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.notes}</p>
                            )}
                          </div>
                        </div>
                        {(isAdmin || selectedPlan.regional_manager_id === user?.id) && (
                          <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => setActivityModal({ mode: 'edit', item })}
                              className="rounded-lg p-2 text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20"
                              title="Uredi aktivnost"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Obrisati ovu aktivnost?')) {
                                  deleteItemMutation.mutate({
                                    planId: selectedPlan.id,
                                    itemId: item.id,
                                  });
                                }
                              }}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Obriši aktivnost"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}

        {completeItemId && selectedPlan && (
          <DateActionModal
            title="Označi aktivnost kao urađenu"
            date={completeDate}
            onDateChange={setCompleteDate}
            onClose={() => setCompleteItemId(null)}
            onConfirm={() => {
              updateItemMutation.mutate({
                planId: selectedPlan.id,
                itemId: completeItemId,
                data: { status: 'completed', completed_date: completeDate },
              });
            }}
            loading={updateItemMutation.isPending}
          />
        )}

        {completePlanOpen && selectedPlan && (
          <DateActionModal
            title="Označi plan kao urađen"
            date={completeDate}
            onDateChange={setCompleteDate}
            onClose={() => setCompletePlanOpen(false)}
            onConfirm={() => {
              updatePlanMutation.mutate({
                id: selectedPlan.id,
                data: { status: 'completed', end_date: completeDate },
              });
            }}
            loading={updatePlanMutation.isPending}
          />
        )}

        {activityModal && selectedPlan && (
          <ActivityFormModal
            item={activityModal.mode === 'edit' ? activityModal.item : null}
            stores={Array.isArray(stores) ? stores : (stores as any)?.data || []}
            users={Array.isArray(users) ? users : []}
            onClose={() => setActivityModal(null)}
            onSubmit={(data) => {
              if (activityModal.mode === 'edit') {
                updateItemMutation.mutate({
                  planId: selectedPlan.id,
                  itemId: activityModal.item.id,
                  data,
                });
              } else {
                createItemMutation.mutate({ planId: selectedPlan.id, data: { ...data, priority: 0 } });
              }
            }}
            isLoading={createItemMutation.isPending || updateItemMutation.isPending}
          />
        )}

        {showPlanModal && (
          <PlanFormModal
            plan={editingPlan}
            stores={Array.isArray(stores) ? stores : (stores as any)?.data || []}
            users={Array.isArray(users) ? users : []}
            onClose={() => {
              setShowPlanModal(false);
              setEditingPlan(null);
            }}
            onCreate={(data) => createPlanMutation.mutate(data)}
            onUpdate={(id, data) => updatePlanMutation.mutate({ id, data })}
            isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <ClipboardList className="h-7 w-7 text-teal-500" />
            Plan kontrola i obilazaka
          </h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Menadžer kreira plan i aktivnosti; izvršioci pregledaju i označavaju urađeno
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPlan(null);
            setShowPlanModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <Sparkles className="h-5 w-5" />
          Novi plan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard
          icon={<ListTodo className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
          iconBg="bg-gray-100 dark:bg-gray-700"
          value={total}
          label="Ukupno planova"
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />}
          iconBg="bg-teal-100 dark:bg-teal-900/30"
          value={activeCount}
          label="Aktivni"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
          iconBg="bg-green-100 dark:bg-green-900/30"
          value={completedCount}
          label="Završeni"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterPill active={!statusFilter} onClick={() => setStatusFilter('')} label="Svi" />
          {(Object.keys(STATUS_CONFIG) as ControlPlanStatus[]).map((s) => (
            <FilterPill
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={STATUS_CONFIG[s].label}
            />
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretraži planove..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          Učitavanje planova...
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800">
          <AlertCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="mb-4 text-gray-500 dark:text-gray-400">Nema planova. Kreirajte prvi plan.</p>
          <button
            onClick={() => setShowPlanModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Novi plan
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {plans.map((plan) => {
              const StatusIcon = STATUS_CONFIG[plan.status].icon;
              const progress =
                plan.total_stores > 0
                  ? Math.round((plan.completed_stores / plan.total_stores) * 100)
                  : 0;
              return (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/40 sm:px-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">
                          {plan.title}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[plan.status].color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {STATUS_CONFIG[plan.status].label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {TYPE_LABELS[plan.type]} · Kreiran{' '}
                        {formatDate(plan.start_date || plan.created_at)}
                        {plan.regional_manager_name ? ` · ${plan.regional_manager_name}` : ''}
                      </p>
                      <div className="mt-2 max-w-xs">
                        <div className="mb-1 flex justify-between text-xs text-gray-500">
                          <span>
                            {plan.completed_stores}/{plan.total_stores} aktivnosti
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {(isAdmin || plan.regional_manager_id === user?.id) && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Obrisati ovaj plan?')) {
                              deletePlanMutation.mutate(plan.id);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              if (confirm('Obrisati ovaj plan?')) {
                                deletePlanMutation.mutate(plan.id);
                              }
                            }
                          }}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showPlanModal && (
        <PlanFormModal
          plan={editingPlan}
          stores={Array.isArray(stores) ? stores : (stores as any)?.data || []}
          users={Array.isArray(users) ? users : []}
          onClose={() => {
            setShowPlanModal(false);
            setEditingPlan(null);
          }}
          onCreate={(data) => createPlanMutation.mutate(data)}
          onUpdate={(id, data) => updatePlanMutation.mutate({ id, data })}
          isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
        />
      )}
    </div>
  );
}

function KpiCard({
  icon,
  iconBg,
  value,
  label,
  small,
}: {
  icon: ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconBg}`}>{icon}</div>
        <div className="min-w-0">
          <p
            className={`font-bold text-gray-900 dark:text-white ${
              small ? 'truncate text-sm' : 'text-2xl'
            }`}
          >
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-teal-600 text-white'
          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function DateActionModal({
  title,
  date,
  onDateChange,
  onClose,
  onConfirm,
  loading,
}: {
  title: string;
  date: string;
  onDateChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Datum izvršenja
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              required
            />
            {date && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Odabrano: {formatDate(date)}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
          >
            Otkaži
          </button>
          <button
            type="button"
            disabled={loading || !date}
            onClick={onConfirm}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Čuvanje...' : 'Potvrdi'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanFormModal({
  plan,
  stores,
  users,
  onClose,
  onCreate,
  onUpdate,
  isLoading,
}: {
  plan: ControlPlan | null;
  stores: any[];
  users: any[];
  onClose: () => void;
  onCreate: (data: any) => void;
  onUpdate: (id: number, data: any) => void;
  isLoading: boolean;
}) {
  const isEdit = !!plan;
  const [formData, setFormData] = useState({
    type: (plan?.type || 'store_visit') as ControlPlanType,
    title: plan?.title || '',
    description: plan?.description || '',
    created_date: toApiDate(plan?.start_date || plan?.created_at) || todayApi(),
    regional_manager_id: plan?.regional_manager_id || undefined,
    status: (plan?.status || 'active') as ControlPlanStatus,
    notes: plan?.notes || '',
  });

  const [draftActivities, setDraftActivities] = useState<DraftActivity[]>(
    isEdit
      ? []
      : [
          {
            key: crypto.randomUUID(),
            store_id: '',
            planned_date: todayApi(),
            assigned_to: '',
            notes: '',
          },
        ]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEdit && plan) {
      onUpdate(plan.id, {
        type: formData.type,
        title: formData.title,
        description: formData.description || null,
        created_date: formData.created_date,
        regional_manager_id: formData.regional_manager_id || null,
        status: formData.status,
        notes: formData.notes || null,
      });
      return;
    }

    const items = draftActivities
      .filter((a) => a.store_id && a.planned_date)
      .map((a) => ({
        store_id: parseInt(a.store_id, 10),
        planned_date: a.planned_date,
        assigned_to: a.assigned_to ? parseInt(a.assigned_to, 10) : undefined,
        notes: a.notes || undefined,
        priority: 0,
      }));

    onCreate({
      type: formData.type,
      title: formData.title,
      description: formData.description || null,
      created_date: formData.created_date,
      regional_manager_id: formData.regional_manager_id || null,
      status: formData.status,
      notes: formData.notes || null,
      items,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Uredi plan' : 'Novi plan'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                1. Osnovni podaci
              </h3>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tip plana *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as ControlPlanType })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="store_visit">Obilazak prodavnice</option>
                  <option value="inventory_required">Obavezna inventura</option>
                  <option value="inventory_extraordinary">Vanredna inventura</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Naziv *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Npr. Obilazak banjalučkih prodavnica"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Opis
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Datum kreiranja plana *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.created_date}
                    onChange={(e) => setFormData({ ...formData, created_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  {formData.created_date && (
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(formData.created_date)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ControlPlanStatus })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="draft">Nacrt</option>
                    <option value="active">Aktivan</option>
                    <option value="completed">Završen</option>
                    <option value="cancelled">Otkazan</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Regionalni menadžer
                </label>
                <select
                  value={formData.regional_manager_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      regional_manager_id: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Odaberi menadžera</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Napomene
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </section>

            {!isEdit && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                    2. Aktivnosti (opciono)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftActivities((prev) => [
                        ...prev,
                        {
                          key: crypto.randomUUID(),
                          store_id: '',
                          planned_date: formData.created_date || todayApi(),
                          assigned_to: '',
                          notes: '',
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj aktivnost
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Možete odmah dodati aktivnosti; kasnije ih možete mijenjati u detalju plana.
                </p>
                <div className="space-y-3">
                  {draftActivities.map((activity, index) => (
                    <div
                      key={activity.key}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Aktivnost {index + 1}
                        </span>
                        {draftActivities.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDraftActivities((prev) =>
                                prev.filter((a) => a.key !== activity.key)
                              )
                            }
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select
                          value={activity.store_id}
                          onChange={(e) =>
                            setDraftActivities((prev) =>
                              prev.map((a) =>
                                a.key === activity.key ? { ...a, store_id: e.target.value } : a
                              )
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Prodavnica</option>
                          {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.code ? `(${s.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={activity.planned_date}
                          onChange={(e) =>
                            setDraftActivities((prev) =>
                              prev.map((a) =>
                                a.key === activity.key
                                  ? { ...a, planned_date: e.target.value }
                                  : a
                              )
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <select
                          value={activity.assigned_to}
                          onChange={(e) =>
                            setDraftActivities((prev) =>
                              prev.map((a) =>
                                a.key === activity.key ? { ...a, assigned_to: e.target.value } : a
                              )
                            )
                          }
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:col-span-2"
                        >
                          <option value="">Izvršilac (opciono)</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Čuvanje...' : isEdit ? 'Sačuvaj izmjene' : 'Kreiraj plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActivityFormModal({
  item,
  stores,
  users,
  onClose,
  onSubmit,
  isLoading,
}: {
  item: ControlPlanItem | null;
  stores: any[];
  users: any[];
  onClose: () => void;
  onSubmit: (data: ControlPlanItemInput) => void;
  isLoading: boolean;
}) {
  const isEdit = !!item;
  const [formData, setFormData] = useState({
    store_id: item?.store_id ? String(item.store_id) : '',
    planned_date: toApiDate(item?.planned_date) || todayApi(),
    assigned_to: item?.assigned_to ? String(item.assigned_to) : '',
    notes: item?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      store_id: parseInt(formData.store_id, 10),
      planned_date: formData.planned_date,
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : null,
      notes: formData.notes.trim() || null,
    });
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Uredi aktivnost' : 'Dodaj aktivnost'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prodavnica *
              </label>
              <select
                required
                value={formData.store_id}
                onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                className={inputClass}
              >
                <option value="">Odaberi prodavnicu</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Planirani datum *
              </label>
              <input
                type="date"
                required
                value={formData.planned_date}
                onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
                className={inputClass}
              />
              {formData.planned_date && (
                <p className="mt-1 text-xs text-gray-500">{formatDate(formData.planned_date)}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Izvršilac
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className={inputClass}
              >
                <option value="">Bez izvršioca</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Napomena
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.store_id || !formData.planned_date}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Čuvanje...' : isEdit ? 'Sačuvaj izmjene' : 'Dodaj aktivnost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
