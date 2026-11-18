import { Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CalendarDays,
  Check,
  ClipboardCheck,
  Download,
  FilePlus,
  FolderOpen,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/dateFormat';
import type { DecisionKind, DecisionSettings, DecisionTemplate, EmploymentDecision, LeavePlanItem, LeaveRegisterRow } from '../../../types/hrm';
import {
  cancelEmploymentDecision,
  createEmploymentDecision,
  deleteDecisionTemplate,
  downloadEmploymentDecisionDocument,
  generateEmploymentDecisionDocument,
  getDecisionTemplates,
  getEmploymentDecisionSettings,
  getEmploymentDecisions,
  confirmLeavePlan,
  createLeavePlanItem,
  deleteLeavePlanItem,
  getLeavePlan,
  getLeaveRegister,
  updateEmploymentDecisionSettings,
  updateLeaveEntitlement,
  updateLeavePlanItem,
  uploadDecisionTemplate,
} from '../../../services/hrmService';

const KIND_LABELS: Record<DecisionKind, string> = {
  annual_leave: 'Godišnji odmor',
  unpaid_leave: 'Neplaćeno odsustvo',
  employment: 'Zasnivanje radnog odnosa',
  position_change: 'Raspored',
  salary_change: 'Plaća',
  termination: 'Prestanak radnog odnosa',
  other: 'Odluka',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nacrt',
  issued: 'Izdata',
  cancelled: 'Poništena',
};

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  issued: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

const excelHead =
  'sticky top-0 z-10 border border-gray-300 bg-[#f2f2f2] px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200';
const excelCell =
  'border border-gray-300 px-2.5 py-1.5 align-middle text-gray-800 dark:border-gray-600 dark:text-gray-100';

const EMPTY_SETTINGS: DecisionSettings = {
  decision_number_prefix: 'RJ-',
  decision_number_next: 1,
  default_annual_leave_days: 20,
  generate_document_by_default: true,
};

function workingDays(from: string, to: string) {
  if (!from || !to) return '';
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return '';
  let days = 0;
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return String(days);
}

function errorMessage(error: any, fallback: string) {
  return error?.response?.data?.message || fallback;
}

export default function DecisionsModule() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'plan' | 'leave' | 'decisions'>('plan');
  const [planTarget, setPlanTarget] = useState<LeavePlanItem | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<LeaveRegisterRow | null>(null);
  const [entitlementTarget, setEntitlementTarget] = useState<LeaveRegisterRow | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['hrm-decision-settings'],
    queryFn: getEmploymentDecisionSettings,
  });
  const { data: decisionsData, isLoading: decisionsLoading } = useQuery({
    queryKey: ['hrm-decisions', search, kind, status],
    queryFn: () =>
      getEmploymentDecisions({
        search: search || undefined,
        kind: kind || undefined,
        status: status || undefined,
        per_page: 2000,
      }),
  });
  const { data: allDecisionsData } = useQuery({
    queryKey: ['hrm-decisions-all'],
    queryFn: () => getEmploymentDecisions({ per_page: 2000 }),
  });
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['hrm-leave-plan', year],
    queryFn: () => getLeavePlan(year),
  });
  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ['hrm-leave-register', year],
    queryFn: () => getLeaveRegister(year),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ['hrm-decision-templates'],
    queryFn: getDecisionTemplates,
    enabled: showTemplates || showCreate || view === 'plan' || showPlanForm,
  });

  const decisions = decisionsData?.data || [];
  const allDecisions = allDecisionsData?.data || [];
  const rows = leaveData?.rows || [];
  const planItems = planData?.items || [];
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['hrm-decisions'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-decisions-all'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-leave-register'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-leave-plan'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-decision-settings'] });
  };

  const createMutation = useMutation({
    mutationFn: createEmploymentDecision,
    onSuccess: () => {
      toast.success('Rješenje je sačuvano.');
      setShowCreate(false);
      setLeaveTarget(null);
      refresh();
    },
    onError: (error) => toast.error(errorMessage(error, 'Greška pri čuvanju rješenja.')),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rješenja i odluke</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Akti za radnike sa ugovorom o radu i evidencija godišnjeg odmora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowTemplates((open) => !open)} className="btn-secondary">
            <FolderOpen className="h-4 w-4" /> Šabloni
          </button>
          <button type="button" onClick={() => setShowSettings(true)} className="btn-secondary">
            <Settings className="h-4 w-4" /> Postavke
          </button>
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Novo rješenje
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <TabButton active={view === 'plan'} onClick={() => setView('plan')}>
          Plan godišnjeg
        </TabButton>
        <TabButton active={view === 'leave'} onClick={() => setView('leave')}>
          Godišnji odmor
        </TabButton>
        <TabButton active={view === 'decisions'} onClick={() => setView('decisions')}>
          Sva rješenja
        </TabButton>
      </div>

      {showTemplates && (
        <TemplatesPanel
          templates={templates}
          onClose={() => setShowTemplates(false)}
          onChanged={() => queryClient.invalidateQueries({ queryKey: ['hrm-decision-templates'] })}
        />
      )}

      {view === 'plan' ? (
        <LeavePlan
          year={year}
          onYear={setYear}
          items={planItems}
          rows={rows}
          templates={templates}
          loading={planLoading}
          generateByDefault={settings?.generate_document_by_default ?? true}
          onOpenTemplates={() => setShowTemplates(true)}
          onAdd={() => {
            setPlanTarget(null);
            setShowPlanForm(true);
          }}
          onEdit={(item) => {
            setPlanTarget(item);
            setShowPlanForm(true);
          }}
          onChanged={refresh}
        />
      ) : view === 'leave' ? (
        <LeaveRegister
          year={year}
          onYear={setYear}
          rows={rows}
          decisions={allDecisions}
          planItems={planItems}
          loading={leaveLoading}
          defaultDays={leaveData?.default_annual_leave_days ?? settings?.default_annual_leave_days ?? 20}
          onChanged={refresh}
          onUse={setLeaveTarget}
          onEdit={setEntitlementTarget}
        />
      ) : (
        <DecisionsTable
          decisions={decisions}
          loading={decisionsLoading}
          search={search}
          kind={kind}
          status={status}
          onSearch={setSearch}
          onKind={setKind}
          onStatus={setStatus}
          onChanged={refresh}
        />
      )}

      {showSettings && (
        <SettingsModal
          initial={settings || EMPTY_SETTINGS}
          onClose={() => setShowSettings(false)}
          onSaved={refresh}
        />
      )}
      {showCreate && (
        <DecisionForm
          rows={rows}
          settings={settings || EMPTY_SETTINGS}
          pending={createMutation.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      )}
      {leaveTarget && (
        <LeaveUseModal
          row={leaveTarget}
          pending={createMutation.isPending}
          generateByDefault={settings?.generate_document_by_default ?? true}
          onClose={() => setLeaveTarget(null)}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      )}
      {showPlanForm && (
        <PlanForm
          year={year}
          rows={rows}
          item={planTarget}
          templates={templates}
          onClose={() => setShowPlanForm(false)}
          onSaved={() => {
            setShowPlanForm(false);
            refresh();
          }}
        />
      )}
      {entitlementTarget && (
        <EntitlementModal
          row={entitlementTarget}
          onClose={() => setEntitlementTarget(null)}
          onSaved={() => {
            setEntitlementTarget(null);
            refresh();
          }}
        />
      )}
      <style>{`
        .btn-primary { display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 0.5rem; background: rgb(79 70 229); padding: 0.5rem 0.875rem; font-size: 0.875rem; color: white; }
        .btn-secondary { display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 0.5rem; border: 1px solid rgb(229 231 235); padding: 0.5rem 0.875rem; font-size: 0.875rem; }
        .field { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(209 213 219); padding: 0.45rem 0.7rem; font-size: 0.875rem; background: white; }
        .dark .field { border-color: rgb(55 65 81); background: rgb(17 24 39); color: white; }
      `}</style>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200'}`}
    >
      {children}
    </button>
  );
}

function LeavePlan({
  year,
  onYear,
  items,
  rows,
  templates,
  loading,
  generateByDefault,
  onAdd,
  onEdit,
  onOpenTemplates,
  onChanged,
}: {
  year: number;
  onYear: (year: number) => void;
  items: LeavePlanItem[];
  rows: LeaveRegisterRow[];
  templates: DecisionTemplate[];
  loading: boolean;
  generateByDefault: boolean;
  onAdd: () => void;
  onEdit: (item: LeavePlanItem) => void;
  onOpenTemplates: () => void;
  onChanged: () => void;
}) {
  const baseYear = new Date().getFullYear();
  const years = [baseYear - 1, baseYear, baseYear + 1];
  const planned = items.filter((item) => item.status === 'planned');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const groups = new Map<number, LeavePlanItem[]>();
  items.forEach((item) => {
    const list = groups.get(item.employee_id) || [];
    list.push(item);
    groups.set(item.employee_id, list);
  });
  const groupList = Array.from(groups.values()).filter((group) =>
    `${group[0].employee_name || ''} ${group[0].contract_number || ''}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(groupList.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visibleGroups = groupList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const remove = useMutation({
    mutationFn: deleteLeavePlanItem,
    onSuccess: () => {
      toast.success('Stavka plana je obrisana.');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Stavka se ne može obrisati.')),
  });
  const assignTemplate = useMutation({
    mutationFn: ({ item, templateId }: { item: LeavePlanItem; templateId: number | null }) =>
      updateLeavePlanItem(item.id, {
        year: item.year,
        employee_id: item.employee_id,
        contract_id: item.contract_id,
        date_from: String(item.date_from).slice(0, 10),
        date_to: String(item.date_to).slice(0, 10),
        days: item.days,
        notes: item.notes || undefined,
        template_id: templateId,
      }),
    onSuccess: () => onChanged(),
    onError: (error) => toast.error(errorMessage(error, 'Šablon nije sačuvan.')),
  });
  const confirm = useMutation({
    mutationFn: () => confirmLeavePlan({ year, generate_document: generateByDefault }),
    onSuccess: (result) => {
      toast.success(result.message || 'Plan je potvrđen i rješenja su kreirana.');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Plan nije potvrđen.')),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Plan godišnjih odmora</h4>
          <p className="text-xs text-gray-500">
            Ovdje su samo periodi. Svakom periodu dodijelite šablon. Potvrda kreira rješenje iz tog šablona.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Traži radnika"
            className="field w-48"
          />
          <select value={year} onChange={(e) => onYear(Number(e.target.value))} className="field w-auto">
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <button type="button" onClick={onOpenTemplates} className="btn-secondary">
            <Upload className="h-4 w-4" /> Unos šablona
          </button>
          <button type="button" onClick={onAdd} className="btn-secondary">
            <Plus className="h-4 w-4" /> Dodaj period
          </button>
          <button
            type="button"
            disabled={planned.length === 0 || confirm.isPending}
            onClick={() => {
              const missing = planned.filter((item) => !item.template_id).length;
              if (missing > 0) {
                toast.error(`Dodijelite šablon za ${missing} ${missing === 1 ? 'period' : 'perioda'} prije potvrde.`);
                return;
              }
              confirm.mutate();
            }}
            className="btn-primary"
          >
            <Check className="h-4 w-4" />
            {confirm.isPending ? 'Potvrda...' : `Potvrdi plan (${planned.length})`}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-500">Učitavanje...</div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500">
          Plan za {year}. još nema stavki. {rows.length === 0 ? 'Nema radnika sa ugovorom o radu.' : 'Dodajte prvi period i šablon.'}
        </div>
      ) : (
        <div className="max-h-[68vh] overflow-auto">
          <table className="min-w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Radnik', 'Ugovor', 'Od', 'Do', 'Dana', 'Šablon', 'Status', 'Akcije'].map((label) => (
                  <th key={label} className={excelHead}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map((group) => {
                const plannedDays = group.reduce((sum, item) => sum + Number(item.days || 0), 0);
                return (
                  <Fragment key={group[0].employee_id}>
                    {group.map((item, index) => (
                      <tr key={item.id} className={index === 0 ? 'bg-white dark:bg-gray-800' : 'bg-[#f4f7fb] dark:bg-gray-900/40'}>
                        {index === 0 && (
                          <td className={`${excelCell} font-medium`} rowSpan={group.length}>
                            <div>{item.employee_name || '—'}</div>
                            {group.length > 1 && (
                              <div className="mt-1 text-[11px] font-medium text-indigo-700">{group.length} dijela · {plannedDays} dana</div>
                            )}
                          </td>
                        )}
                        {index === 0 && (
                          <td className={excelCell} rowSpan={group.length}>{item.contract_number || 'Bez broja'}</td>
                        )}
                        <td className={excelCell}>
                          <span className="mr-2 text-[11px] font-semibold text-gray-400">Dio {index + 1}</span>
                          {formatDate(item.date_from)}
                        </td>
                        <td className={excelCell}>{formatDate(item.date_to)}</td>
                        <td className={excelCell}>{item.days}</td>
                        <td className={excelCell}>
                          {item.status === 'planned' ? (
                            <select
                              value={item.template_id || ''}
                              onChange={(e) => assignTemplate.mutate({
                                item,
                                templateId: e.target.value ? Number(e.target.value) : null,
                              })}
                              className="field min-w-[11rem] py-1 text-xs"
                            >
                              <option value="">{templates.length ? 'Odaberi šablon' : 'Nema šablona'}</option>
                              {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name} · {KIND_LABELS[template.kind]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{item.template_name || '—'}</span>
                          )}
                        </td>
                        <td className={excelCell}>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                            {item.status === 'confirmed' ? 'Potvrđeno' : 'U planu'}
                          </span>
                        </td>
                        <td className={excelCell}>
                          {item.status === 'planned' && (
                            <div className="flex justify-center gap-1">
                              <IconAction label="Uredi period" onClick={() => onEdit(item)} className="text-gray-700 hover:bg-gray-100">
                                <Pencil className="h-4 w-4" />
                              </IconAction>
                              <IconAction label="Obriši iz plana" onClick={() => remove.mutate(item.id)} className="text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </IconAction>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {groupList.length > 0 && <Pager page={currentPage} pages={pages} total={groupList.length} onPage={setPage} />}
    </div>
  );
}

function PlanForm({
  year,
  rows,
  item,
  templates,
  onClose,
  onSaved,
}: {
  year: number;
  rows: LeaveRegisterRow[];
  item: LeavePlanItem | null;
  templates: DecisionTemplate[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    employee_id: item ? String(item.employee_id) : '',
    date_from: item?.date_from?.slice(0, 10) || '',
    date_to: item?.date_to?.slice(0, 10) || '',
    days: item ? String(item.days) : '',
    notes: item?.notes || '',
    template_id: item?.template_id ? String(item.template_id) : '',
  });
  const selected = rows.find((row) => String(row.employee_id) === form.employee_id);
  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        year,
        employee_id: Number(form.employee_id),
        contract_id: selected?.contract_id,
        date_from: form.date_from,
        date_to: form.date_to,
        days: form.days ? Number(form.days) : undefined,
        notes: form.notes || undefined,
        template_id: form.template_id ? Number(form.template_id) : null,
      };
      return item ? updateLeavePlanItem(item.id, payload) : createLeavePlanItem(payload);
    },
    onSuccess: () => {
      toast.success(item ? 'Period je izmijenjen.' : 'Period je dodat u plan.');
      onSaved();
    },
    onError: (error) => toast.error(errorMessage(error, 'Period nije sačuvan.')),
  });

  return (
    <Modal title={item ? 'Izmjena perioda u planu' : 'Novi period u planu'} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Radnik sa ugovorom" className="md:col-span-2">
          <select value={form.employee_id} onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))} className="field">
            <option value="">Odaberi radnika</option>
            {rows.map((row) => (
              <option key={row.employee_id} value={row.employee_id}>
                {row.employee_name} · {row.contract_number || 'bez broja'} · ostalo {row.remaining_days}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Šablon rješenja" className="md:col-span-2">
          <select value={form.template_id} onChange={(e) => setForm((prev) => ({ ...prev, template_id: e.target.value }))} className="field">
            <option value="">{templates.length ? 'Odaberi šablon' : 'Nema unesenih šablona'}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {KIND_LABELS[template.kind]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Od">
          <input type="date" value={form.date_from} onChange={(e) => setForm((prev) => ({ ...prev, date_from: e.target.value, days: workingDays(e.target.value, prev.date_to) }))} className="field" />
        </Field>
        <Field label="Do">
          <input type="date" value={form.date_to} onChange={(e) => setForm((prev) => ({ ...prev, date_to: e.target.value, days: workingDays(prev.date_from, e.target.value) }))} className="field" />
        </Field>
        <Field label="Radnih dana">
          <input value={form.days} onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))} className="field" />
        </Field>
        <Field label="Napomena">
          <input value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="field" />
        </Field>
      </div>
      <p className="mt-2 text-xs text-gray-500">Dani su radni, od ponedjeljka do petka. Šablon se koristi tek kad se period potvrdi i kreira rješenje.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Odustani</button>
        <button type="button" disabled={!form.employee_id || !form.date_from || !form.date_to || mutation.isPending} onClick={() => mutation.mutate()} className="btn-primary">
          Sačuvaj u plan
        </button>
      </div>
    </Modal>
  );
}

function leaveParts(
  employeeId: number,
  year: number,
  decisions: EmploymentDecision[],
  planItems: LeavePlanItem[]
) {
  const issued = decisions
    .filter(
      (decision) =>
        decision.employee_id === employeeId &&
        decision.kind === 'annual_leave' &&
        Number(decision.leave_year) === year &&
        decision.status !== 'cancelled'
    )
    .map((decision) => ({
      key: `decision-${decision.id}`,
      from: decision.date_from,
      to: decision.date_to,
      days: decision.days ?? '—',
      number: decision.decision_number || 'Bez broja',
      source: 'rješenje',
      statusLabel: STATUS_LABELS[decision.status] || decision.status,
      sort: decision.date_from || '',
      decisionId: decision.id as number | null,
      hasDocument: Boolean(decision.generated_document_path),
    }));
  const planned = planItems
    .filter((item) => item.employee_id === employeeId && item.status === 'planned')
    .map((item) => ({
      key: `plan-${item.id}`,
      from: item.date_from,
      to: item.date_to,
      days: item.days,
      number: 'Još nije izdato',
      source: 'plan',
      statusLabel: 'U planu',
      sort: item.date_from,
      decisionId: null as number | null,
      hasDocument: false,
    }));

  return [...issued, ...planned]
    .sort((left, right) => String(left.sort).localeCompare(String(right.sort)))
    .map((part, index) => ({ ...part, index: index + 1 }));
}

function WorkerDecisions({ decisions, onChanged }: { decisions: EmploymentDecision[]; onChanged: () => void }) {
  if (decisions.length === 0) {
    return <p className="text-xs text-gray-500">Ovaj radnik još nema rješenja.</p>;
  }

  return (
    <table className="min-w-full border-collapse text-xs">
      <thead>
        <tr>
          {['Broj', 'Vrsta', 'Period', 'Dana', 'Status', 'Preuzmi'].map((label) => (
            <th key={label} className={excelHead}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {decisions.map((decision) => (
          <tr key={decision.id}>
            <td className={excelCell}>{decision.decision_number || 'Bez broja'}</td>
            <td className={excelCell}>{KIND_LABELS[decision.kind] || decision.title}</td>
            <td className={excelCell}>
              {decision.date_from ? `${formatDate(decision.date_from)} – ${formatDate(decision.date_to)}` : formatDate(decision.decision_date)}
            </td>
            <td className={excelCell}>{decision.days ?? '—'}</td>
            <td className={excelCell}>{STATUS_LABELS[decision.status] || decision.status}</td>
            <td className={excelCell}>
              <DocumentActions
                decisionId={decision.id}
                hasDocument={Boolean(decision.generated_document_path)}
                onChanged={onChanged}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DocumentActions({
  decisionId,
  hasDocument,
  onChanged,
}: {
  decisionId?: number | null;
  hasDocument: boolean;
  onChanged: () => void;
}) {
  const generate = useMutation({
    mutationFn: generateEmploymentDecisionDocument,
    onSuccess: () => {
      toast.success('Rješenje za ovaj period je spremno za preuzimanje.');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Greška pri generisanju.')),
  });

  if (!decisionId) return <span className="text-[11px] text-gray-400">nije izdato</span>;

  return (
    <span className="inline-flex gap-1">
      {hasDocument ? (
        <IconAction label="Preuzmi rješenje ovog perioda" onClick={() => downloadEmploymentDecisionDocument(decisionId)} className="text-gray-700 hover:bg-gray-100">
          <Download className="h-4 w-4" />
        </IconAction>
      ) : (
        <IconAction label="Napravi rješenje ovog perioda" onClick={() => generate.mutate(decisionId)} className="text-blue-700 hover:bg-blue-50">
          <FilePlus className="h-4 w-4" />
        </IconAction>
      )}
    </span>
  );
}

function LeaveRegister({
  year,
  onYear,
  rows,
  decisions,
  planItems,
  loading,
  defaultDays,
  onUse,
  onEdit,
  onChanged,
}: {
  year: number;
  onYear: (year: number) => void;
  rows: LeaveRegisterRow[];
  decisions: EmploymentDecision[];
  planItems: LeavePlanItem[];
  loading: boolean;
  defaultDays: number;
  onUse: (row: LeaveRegisterRow) => void;
  onEdit: (row: LeaveRegisterRow) => void;
  onChanged: () => void;
}) {
  const baseYear = new Date().getFullYear();
  const years = [baseYear - 1, baseYear, baseYear + 1];
  const [openWorkers, setOpenWorkers] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const filtered = rows.filter((row) => {
    const haystack = `${row.employee_name || ''} ${row.contract_number || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visibleRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const toggleWorker = (employeeId: number) => {
    setOpenWorkers((current) =>
      current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId]
    );
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Obrazac godišnjeg odmora</h4>
            <p className="text-xs text-gray-500">
            Jedan red je jedan radnik. Svaki dio odmora ima svoje dugme za preuzimanje. Prikaz je {pageSize} radnika po strani, podrazumijevano pravo je {defaultDays} dana.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Traži radnika ili ugovor"
            className="field w-56"
          />
          <select value={year} onChange={(e) => { onYear(Number(e.target.value)); setPage(1); }} className="field w-auto">
            {Array.from(new Set(years)).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-500">Učitavanje...</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500">Nema radnika za ovu pretragu.</div>
      ) : (
        <div className="max-h-[68vh] overflow-auto">
          <table className="min-w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Radnik', 'Ugovor', 'Pravo', 'Iskorišteno', 'Ostalo', 'Dijelovi odmora', 'Akcije'].map((label) => (
                  <th key={label} className={excelHead}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const parts = leaveParts(row.employee_id, year, decisions, planItems);
                const workerDecisions = decisions.filter((decision) => decision.employee_id === row.employee_id);
                const open = openWorkers.includes(row.employee_id);
                return (
                <Fragment key={row.employee_id}>
                <tr className={index % 2 ? 'bg-[#f4f7fb] dark:bg-gray-900/40' : 'bg-white dark:bg-gray-800'}>
                  <td className={`${excelCell} font-medium`}>
                    <div>{row.employee_name || '—'}</div>
                    {parts.length > 1 && (
                      <div className="mt-1 text-[11px] font-medium text-indigo-700">{parts.length} dijela odmora</div>
                    )}
                    <button type="button" onClick={() => toggleWorker(row.employee_id)} className="mt-1 text-[11px] text-blue-600 hover:underline">
                      {open ? 'Sakrij rješenja' : `Sva rješenja (${workerDecisions.length})`}
                    </button>
                  </td>
                  <td className={excelCell}>{row.contract_number || 'Bez broja'}</td>
                  <td className={excelCell}>{row.entitled_days}{row.carried_over_days ? <span className="text-gray-500"> +{row.carried_over_days}</span> : null}</td>
                  <td className={excelCell}>{row.used_days}</td>
                  <td className={`${excelCell} font-semibold ${row.remaining_days <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {row.remaining_days}
                  </td>
                  <td className={excelCell}>
                    {parts.length === 0 ? (
                      <span className="text-xs text-gray-400">Nema dijelova</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {parts.map((part) => (
                          <div key={part.key} className="flex items-center justify-between gap-2 text-xs">
                            <span>
                              Dio {part.index}: {formatDate(part.from)} – {formatDate(part.to)} · {part.days} d · {part.number}
                            </span>
                            <DocumentActions decisionId={part.decisionId} hasDocument={part.hasDocument} onChanged={onChanged} />
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={excelCell}>
                    <div className="flex justify-center gap-1">
                      <IconAction label="Upiši iskorištene dane" onClick={() => onUse(row)} className="text-indigo-700 hover:bg-indigo-50">
                        <CalendarDays className="h-4 w-4" />
                      </IconAction>
                      <IconAction label="Uredi pravo i prenos" onClick={() => onEdit(row)} className="text-gray-700 hover:bg-gray-100">
                        <Settings className="h-4 w-4" />
                      </IconAction>
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={7} className="border border-gray-300 bg-slate-50 p-3 dark:border-gray-600 dark:bg-gray-900/60">
                      <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">Sva rješenja — {row.employee_name}</p>
                      <WorkerDecisions decisions={workerDecisions} onChanged={onChanged} />
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length > 0 && <Pager page={currentPage} pages={pages} total={filtered.length} onPage={setPage} />}
    </div>
  );
}

function DecisionsTable({
  decisions,
  loading,
  search,
  kind,
  status,
  onSearch,
  onKind,
  onStatus,
  onChanged,
}: {
  decisions: EmploymentDecision[];
  loading: boolean;
  search: string;
  kind: string;
  status: string;
  onSearch: (value: string) => void;
  onKind: (value: string) => void;
  onStatus: (value: string) => void;
  onChanged: () => void;
}) {
  const generate = useMutation({
    mutationFn: generateEmploymentDecisionDocument,
    onSuccess: () => {
      toast.success('Dokument je generisan.');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Greška pri generisanju.')),
  });
  const cancel = useMutation({
    mutationFn: cancelEmploymentDecision,
    onSuccess: () => {
      toast.success('Rješenje je poništeno. Dani godišnjeg se vraćaju u ostatak.');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Greška pri poništavanju.')),
  });
  const filterKey = `${search}|${kind}|${status}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });
  const pageSize = 40;
  const pages = Math.max(1, Math.ceil(decisions.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = decisions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="grid grid-cols-1 gap-2 border-b border-gray-200 p-3 md:grid-cols-3 dark:border-gray-700">
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Pretraga po radniku, broju, ugovoru" className="field" />
        <select value={kind} onChange={(e) => onKind(e.target.value)} className="field">
          <option value="">Sve vrste</option>
          {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={status} onChange={(e) => onStatus(e.target.value)} className="field">
          <option value="">Svi statusi</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="p-10 text-center text-sm text-gray-500">Učitavanje...</div>
      ) : decisions.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500">Nema rješenja za odabrani filter.</div>
      ) : (
        <div className="max-h-[68vh] overflow-auto">
          <table className="min-w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Broj', 'Radnik', 'Ugovor', 'Vrsta', 'Period', 'Dana', 'Status', 'Akcije'].map((label) => (
                  <th key={label} className={excelHead}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((decision, index) => (
                <tr key={decision.id} className={index % 2 ? 'bg-[#f4f7fb] dark:bg-gray-900/40' : 'bg-white dark:bg-gray-800'}>
                  <td className={`${excelCell} font-semibold`}>{decision.decision_number || 'Bez broja'}</td>
                  <td className={excelCell}>{decision.employee_full_name || decision.employee_user_name || '—'}</td>
                  <td className={excelCell}>{decision.contract_number || '—'}</td>
                  <td className={excelCell}>{KIND_LABELS[decision.kind] || decision.title}</td>
                  <td className={excelCell}>
                    {decision.date_from ? `${formatDate(decision.date_from)} – ${formatDate(decision.date_to)}` : formatDate(decision.decision_date)}
                  </td>
                  <td className={excelCell}>{decision.days ?? '—'}</td>
                  <td className={excelCell}>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[decision.status] || ''}`}>
                      {STATUS_LABELS[decision.status] || decision.status}
                    </span>
                  </td>
                  <td className={excelCell}>
                    <div className="flex justify-center gap-1">
                      <IconAction label="Generiši dokument" onClick={() => generate.mutate(decision.id)} className="text-blue-700 hover:bg-blue-50">
                        <FilePlus className="h-4 w-4" />
                      </IconAction>
                      {decision.generated_document_path && (
                        <IconAction label="Preuzmi dokument" onClick={() => downloadEmploymentDecisionDocument(decision.id)} className="text-gray-700 hover:bg-gray-100">
                          <Download className="h-4 w-4" />
                        </IconAction>
                      )}
                      {decision.status !== 'cancelled' && (
                        <IconAction label="Poništi rješenje" onClick={() => cancel.mutate(decision.id)} className="text-red-700 hover:bg-red-50">
                          <Ban className="h-4 w-4" />
                        </IconAction>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {decisions.length > 0 && <Pager page={currentPage} pages={pages} total={decisions.length} onPage={setPage} />}
    </div>
  );
}

function DecisionForm({
  rows,
  settings,
  pending,
  onClose,
  onSubmit,
}: {
  rows: LeaveRegisterRow[];
  settings: DecisionSettings;
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({
    employee_id: '',
    kind: 'other' as DecisionKind,
    title: '',
    decision_date: new Date().toISOString().slice(0, 10),
    date_from: '',
    date_to: '',
    days: '',
    notes: '',
    status: 'issued',
    generate_document: settings.generate_document_by_default,
  });
  const selected = rows.find((row) => String(row.employee_id) === form.employee_id);
  const needsPeriod = form.kind === 'annual_leave' || form.kind === 'unpaid_leave';

  return (
    <Modal title="Novo rješenje" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Radnik sa ugovorom">
          <select value={form.employee_id} onChange={(e) => setForm((prev) => ({ ...prev, employee_id: e.target.value }))} className="field">
            <option value="">Odaberi radnika</option>
            {rows.map((row) => (
              <option key={row.employee_id} value={row.employee_id}>
                {row.employee_name} · {row.contract_number || 'bez broja'}
                {row.contract_status === 'draft' ? ' · nacrt' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vrsta">
          <select
            value={form.kind}
            onChange={(e) => setForm((prev) => ({ ...prev, kind: e.target.value as DecisionKind, title: '' }))}
            className="field"
          >
            {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Naslov">
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="field" placeholder="Ako ostane prazno, naslov se uzima iz vrste" />
        </Field>
        <Field label="Datum rješenja">
          <input type="date" value={form.decision_date} onChange={(e) => setForm((prev) => ({ ...prev, decision_date: e.target.value }))} className="field" />
        </Field>
        {needsPeriod && (
          <>
            <Field label="Od">
              <input
                type="date"
                value={form.date_from}
                onChange={(e) => setForm((prev) => ({ ...prev, date_from: e.target.value, days: workingDays(e.target.value, prev.date_to) }))}
                className="field"
              />
            </Field>
            <Field label="Do">
              <input
                type="date"
                value={form.date_to}
                onChange={(e) => setForm((prev) => ({ ...prev, date_to: e.target.value, days: workingDays(prev.date_from, e.target.value) }))}
                className="field"
              />
            </Field>
            <Field label="Radnih dana">
              <input value={form.days} onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))} className="field" />
            </Field>
          </>
        )}
        <Field label="Napomena" className="md:col-span-2">
          <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="field min-h-[70px]" />
        </Field>
      </div>
      {form.kind === 'annual_leave' && selected && (
        <p className="mt-3 text-sm text-gray-600">Ostalo dana u {selected.year}: <strong>{selected.remaining_days}</strong></p>
      )}
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.generate_document} onChange={(e) => setForm((prev) => ({ ...prev, generate_document: e.target.checked }))} />
        Generiši dokument
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Odustani</button>
        <button
          type="button"
          disabled={!form.employee_id || pending}
          onClick={() =>
            onSubmit({
              employee_id: Number(form.employee_id),
              contract_id: selected?.contract_id,
              kind: form.kind,
              title: form.title || undefined,
              decision_date: form.decision_date,
              date_from: form.date_from || undefined,
              date_to: form.date_to || undefined,
              days: form.days ? Number(form.days) : undefined,
              leave_year: form.kind === 'annual_leave' ? selected?.year || new Date().getFullYear() : undefined,
              notes: form.notes || undefined,
              status: form.status,
              generate_document: form.generate_document,
            })
          }
          className="btn-primary"
        >
          Sačuvaj
        </button>
      </div>
    </Modal>
  );
}

function LeaveUseModal({
  row,
  pending,
  generateByDefault,
  onClose,
  onSubmit,
}: {
  row: LeaveRegisterRow;
  pending: boolean;
  generateByDefault: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState({ date_from: '', date_to: '', days: '', notes: '', generate_document: generateByDefault });
  return (
    <Modal title={`Godišnji odmor — ${row.employee_name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-gray-600">
        Ugovor {row.contract_number || 'bez broja'}. Pravo {row.entitled_days} + prenos {row.carried_over_days}, iskorišteno {row.used_days}, ostalo <strong>{row.remaining_days}</strong> dana u {row.year}.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Od">
          <input type="date" value={form.date_from} onChange={(e) => setForm((prev) => ({ ...prev, date_from: e.target.value, days: workingDays(e.target.value, prev.date_to) }))} className="field" />
        </Field>
        <Field label="Do">
          <input type="date" value={form.date_to} onChange={(e) => setForm((prev) => ({ ...prev, date_to: e.target.value, days: workingDays(prev.date_from, e.target.value) }))} className="field" />
        </Field>
        <Field label="Radnih dana">
          <input value={form.days} onChange={(e) => setForm((prev) => ({ ...prev, days: e.target.value }))} className="field" />
        </Field>
      </div>
      <p className="mt-2 text-xs text-gray-500">Dani se računaju kao radni dani, od ponedjeljka do petka. Broj se može ispraviti prije čuvanja.</p>
      <Field label="Napomena" className="mt-3">
        <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} className="field min-h-[70px]" />
      </Field>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.generate_document} onChange={(e) => setForm((prev) => ({ ...prev, generate_document: e.target.checked }))} />
        Generiši rješenje o godišnjem odmoru
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Odustani</button>
        <button
          type="button"
          disabled={pending || !form.date_from || !form.date_to || !form.days}
          onClick={() =>
            onSubmit({
              employee_id: row.employee_id,
              contract_id: row.contract_id,
              kind: 'annual_leave',
              leave_year: row.year,
              decision_date: new Date().toISOString().slice(0, 10),
              date_from: form.date_from,
              date_to: form.date_to,
              days: Number(form.days),
              notes: form.notes || undefined,
              status: 'issued',
              generate_document: form.generate_document,
            })
          }
          className="btn-primary"
        >
          Upiši i izdaj rješenje
        </button>
      </div>
    </Modal>
  );
}

function EntitlementModal({
  row,
  onClose,
  onSaved,
}: {
  row: LeaveRegisterRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entitled, setEntitled] = useState(String(row.entitled_days));
  const [carried, setCarried] = useState(String(row.carried_over_days));
  const mutation = useMutation({
    mutationFn: () =>
      updateLeaveEntitlement(row.employee_id, {
        year: row.year,
        entitled_days: Number(entitled),
        carried_over_days: Number(carried),
      }),
    onSuccess: () => {
      toast.success('Pravo na godišnji je sačuvano.');
      onSaved();
    },
    onError: (error) => toast.error(errorMessage(error, 'Greška pri čuvanju prava.')),
  });

  return (
    <Modal title={`Pravo na godišnji — ${row.employee_name}`} onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label={`Pravo u ${row.year}. (dana)`}>
          <input type="number" min={0} value={entitled} onChange={(e) => setEntitled(e.target.value)} className="field" />
        </Field>
        <Field label="Preneseno iz prethodne godine">
          <input type="number" min={0} value={carried} onChange={(e) => setCarried(e.target.value)} className="field" />
        </Field>
      </div>
      <p className="mt-2 text-xs text-gray-500">Ostalo = pravo + preneseno − iskorišteno ({row.used_days}).</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Odustani</button>
        <button type="button" onClick={() => mutation.mutate()} className="btn-primary">Sačuvaj</button>
      </div>
    </Modal>
  );
}

function SettingsModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: DecisionSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const mutation = useMutation({
    mutationFn: updateEmploymentDecisionSettings,
    onSuccess: () => {
      toast.success('Postavke su sačuvane.');
      onSaved();
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, 'Greška pri čuvanju postavki.')),
  });

  return (
    <Modal title="Postavke rješenja" onClose={onClose}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Prefiks broja">
          <input value={form.decision_number_prefix} onChange={(e) => setForm((prev) => ({ ...prev, decision_number_prefix: e.target.value }))} className="field" />
        </Field>
        <Field label="Sljedeći broj">
          <input type="number" min={1} value={form.decision_number_next} onChange={(e) => setForm((prev) => ({ ...prev, decision_number_next: Number(e.target.value) || 1 }))} className="field" />
        </Field>
        <Field label="Podrazumijevani godišnji odmor (dana)">
          <input type="number" min={0} max={60} value={form.default_annual_leave_days} onChange={(e) => setForm((prev) => ({ ...prev, default_annual_leave_days: Number(e.target.value) || 0 }))} className="field" />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.generate_document_by_default} onChange={(e) => setForm((prev) => ({ ...prev, generate_document_by_default: e.target.checked }))} />
        Generiši dokument čim se rješenje izda
      </label>
      <p className="mt-2 text-xs text-gray-500">
        Poslodavac, mjesto potpisa i direktor na dokumentu dolaze iz postavki ugovora.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">Odustani</button>
        <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate(form)} className="btn-primary">Sačuvaj</button>
      </div>
    </Modal>
  );
}

function TemplatesPanel({
  templates,
  onClose,
  onChanged,
}: {
  templates: Array<{ id: number; name: string; kind: DecisionKind; decisions_count?: number; file_exists?: boolean }>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DecisionKind>('annual_leave');
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: () => {
      const data = new FormData();
      data.append('name', name);
      data.append('kind', kind);
      if (file) data.append('file', file);
      return uploadDecisionTemplate(data);
    },
    onSuccess: () => {
      toast.success('Šablon je dodat.');
      setName('');
      setFile(null);
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Greška pri učitavanju šablona.')),
  });
  const remove = useMutation({
    mutationFn: deleteDecisionTemplate,
    onSuccess: () => {
      toast.success('Šablon je obrisan.');
      onChanged();
    },
    onError: (error) => toast.error(errorMessage(error, 'Šablon se ne može obrisati.')),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Šabloni rješenja</h4>
        <button type="button" onClick={onClose} className="text-xs text-gray-500">Sakrij</button>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naziv" className="field" />
        <select value={kind} onChange={(e) => setKind(e.target.value as DecisionKind)} className="field">
          {Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input type="file" accept=".doc,.docx,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
        <button type="button" disabled={!name || !file || upload.isPending} onClick={() => upload.mutate()} className="btn-primary">
          <Upload className="h-4 w-4" /> Dodaj
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">DOCX šablon se popunjava oznakama decision_number, employee_name, contract_number, date_from, date_to, days, leave_year. Bez DOCX šablona sistem pravi PDF.</p>
      <div className="mt-3 space-y-2">
        {templates.length === 0 && <p className="text-sm text-gray-500">Nema učitanih šablona.</p>}
        {templates.map((template) => (
          <div key={template.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
            <span>{template.name} · {KIND_LABELS[template.kind]}{template.file_exists === false ? ' · datoteka nedostaje' : ''}</span>
            <button type="button" onClick={() => remove.mutate(template.id)} className="text-xs text-red-600">Obriši</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={onClick}
        onMouseEnter={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setTip({ x: rect.left + rect.width / 2, y: rect.top });
        }}
        onMouseLeave={() => setTip(null)}
        className={`inline-flex h-7 w-7 items-center justify-center rounded border border-transparent ${className}`}
      >
        {children}
      </button>
      {tip && (
        <span className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full rounded bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow" style={{ left: tip.x, top: tip.y - 6 }}>
          {label}
        </span>
      )}
    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h4>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">Zatvori</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function Pager({
  page,
  pages,
  total,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
      <span>{total} ukupno · strana {page} / {pages}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary disabled:opacity-40">Prethodna</button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-secondary disabled:opacity-40">Sljedeća</button>
      </div>
    </div>
  );
}
