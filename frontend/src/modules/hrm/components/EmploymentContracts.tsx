import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FilePlus,
  FileText,
  Plus,
  RefreshCw,
  Download,
  Settings,
  AlertTriangle,
  Search,
  Upload,
  FolderOpen,
  Pencil,
  Eye,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getEmploymentContracts,
  getEmploymentContractSummary,
  getEmploymentContractTemplates,
  getEmploymentContractSettings,
  createEmploymentContract,
  renewEmploymentContract,
  updateEmploymentContractSettings,
  generateEmploymentContractDocument,
  downloadEmploymentContractDocument,
  downloadEmploymentContractTemplate,
  bulkUpdateEmploymentContracts,
  getEmployees,
  getStores,
} from '../../../services/hrmService';
import type {
  EmploymentContract,
  EmploymentContractFilters,
  EmploymentContractSettings,
  EmploymentContractTemplate,
  LegalEntity,
  JobRole,
} from '../../../types/hrm';
import { formatDate } from '@/utils/dateFormat';
import { useAuthStore } from '@/store/authStore';

const DEFAULT_CONTRACT_SETTINGS: EmploymentContractSettings = {
  default_renewal_notice_days: 30,
  auto_create_renewal_draft: true,
  default_employment_term: 'indefinite',
  default_fixed_months: 12,
  default_auto_renew: true,
  default_currency: 'KM',
  generate_document_by_default: true,
  contract_number_prefix: '',
  contract_number_next: 1,
  employer_name: '',
  employer_address: '',
  sign_city: '',
  director_name: '',
  weekly_hours: 40,
  probation_months: 0,
};

function settingsToForm(settings?: EmploymentContractSettings | null): EmploymentContractSettings {
  return { ...DEFAULT_CONTRACT_SETTINGS, ...(settings || {}) };
}

function addMonths(isoDate: string, months: number): string {
  const date = new Date(`${isoDate || new Date().toISOString().slice(0, 10)}T00:00:00`);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dayText = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayText}`;
}
import ContractTemplatesManager, { TemplatePreviewModal } from './ContractTemplatesManager';

const LEGAL_ENTITY_LABELS: Record<LegalEntity, string> = {
  fbih: 'FBiH',
  rs: 'RS',
  bd: 'BD',
};

const JOB_ROLE_LABELS: Record<JobRole, string> = {
  store_manager: 'Šef prodavnice',
  deputy_manager: 'Zamjenik šefa',
  salesperson: 'Prodavač',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Nacrt',
  active: 'Aktivan',
  expired: 'Istekao',
  terminated: 'Raskinut',
  superseded: 'Zamijenjen',
};

type ContractColumnId =
  | 'contract_number'
  | 'employee'
  | 'document_kind'
  | 'legal_entity'
  | 'job_role'
  | 'position_title'
  | 'store'
  | 'employment_term'
  | 'work_start'
  | 'expiry'
  | 'sign_date'
  | 'effective_date'
  | 'status'
  | 'salary_gross'
  | 'salary_net'
  | 'protocol'
  | 'template'
  | 'annex'
  | 'auto_renew';

const CONTRACT_COLUMNS: { id: ContractColumnId; label: string; defaultVisible: boolean }[] = [
  { id: 'contract_number', label: 'Broj ugovora', defaultVisible: true },
  { id: 'employee', label: 'Zaposlenik', defaultVisible: true },
  { id: 'document_kind', label: 'Vrsta', defaultVisible: true },
  { id: 'legal_entity', label: 'Entitet', defaultVisible: true },
  { id: 'job_role', label: 'Pozicija', defaultVisible: true },
  { id: 'store', label: 'Prodavnica', defaultVisible: true },
  { id: 'employment_term', label: 'Trajanje', defaultVisible: true },
  { id: 'work_start', label: 'Početak', defaultVisible: true },
  { id: 'expiry', label: 'Istek', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'position_title', label: 'Radno mjesto', defaultVisible: false },
  { id: 'salary_gross', label: 'Bruto', defaultVisible: false },
  { id: 'salary_net', label: 'Neto', defaultVisible: false },
  { id: 'protocol', label: 'Protokol', defaultVisible: false },
  { id: 'template', label: 'Šablon', defaultVisible: false },
  { id: 'sign_date', label: 'Datum potpisa', defaultVisible: false },
  { id: 'effective_date', label: 'Primjena od', defaultVisible: false },
  { id: 'annex', label: 'Aneks', defaultVisible: false },
  { id: 'auto_renew', label: 'Auto. produženje', defaultVisible: false },
];

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  expired: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  terminated: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  superseded: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

type ColumnPrefs = { order: ContractColumnId[]; visible: ContractColumnId[] };

function defaultColumnPrefs(): ColumnPrefs {
  return {
    order: CONTRACT_COLUMNS.map((column) => column.id),
    visible: CONTRACT_COLUMNS.filter((column) => column.defaultVisible).map((column) => column.id),
  };
}

function columnStorageKey(userId?: number) {
  return `plantim-hrm-contract-columns:${userId ?? 'local'}`;
}

function loadColumnPrefs(userId?: number): ColumnPrefs {
  const defaults = defaultColumnPrefs();
  try {
    const raw = localStorage.getItem(columnStorageKey(userId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ColumnPrefs>;
    const known = new Set(CONTRACT_COLUMNS.map((column) => column.id));
    const order = (parsed.order || []).filter((id): id is ContractColumnId => known.has(id as ContractColumnId));
    for (const column of CONTRACT_COLUMNS) {
      if (!order.includes(column.id)) order.push(column.id);
    }
    const visible = (parsed.visible || []).filter((id): id is ContractColumnId => known.has(id as ContractColumnId));
    return { order, visible: visible.length > 0 ? visible : defaults.visible };
  } catch {
    return defaults;
  }
}

function formatMoney(value?: number | null, currency?: string) {
  if (value === null || value === undefined) return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return `${amount.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || 'KM'}`;
}

function renderContractCell(
  id: ContractColumnId,
  contract: EmploymentContract,
  employeeContractCount: number
) {
  switch (id) {
    case 'contract_number':
      return (
        <span className={contract.contract_number ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}>
          {contract.contract_number || 'Bez broja'}
        </span>
      );
    case 'employee':
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {contract.employee_full_name || contract.employee_user_name || '—'}
          </span>
          {employeeContractCount > 1 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {employeeContractCount} ugovora
            </span>
          )}
        </div>
      );
    case 'document_kind':
      return contract.document_kind === 'annex' ? 'Aneks' : 'Ugovor';
    case 'legal_entity':
      return LEGAL_ENTITY_LABELS[contract.legal_entity] || '—';
    case 'job_role':
      return JOB_ROLE_LABELS[contract.job_role] || '—';
    case 'position_title':
      return contract.position_title || '—';
    case 'store':
      return contract.store_label || contract.store_name || '—';
    case 'employment_term':
      return contract.employment_term === 'fixed' ? 'Određeno' : 'Neodređeno';
    case 'work_start':
      return formatDate(contract.work_start_date);
    case 'expiry':
      return formatDate(contract.expiry_date || contract.work_end_date);
    case 'sign_date':
      return formatDate(contract.contract_sign_date);
    case 'effective_date':
      return formatDate(contract.effective_date);
    case 'status':
      return (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[contract.status] || STATUS_CLASS.draft}`}>
          {STATUS_LABELS[contract.status] || contract.status}
        </span>
      );
    case 'salary_gross':
      return formatMoney(contract.salary_gross, contract.currency);
    case 'salary_net':
      return formatMoney(contract.salary_net, contract.currency);
    case 'protocol':
      return contract.protocol_number || '—';
    case 'template':
      return contract.template_name || '—';
    case 'annex':
      return contract.annex_number ? String(contract.annex_number) : '—';
    case 'auto_renew':
      return contract.auto_renew ? 'Da' : 'Ne';
    default:
      return '—';
  }
}

const TERM_PRESETS = [
  { value: '', label: 'Bez promjene trajanja' },
  { value: 'indefinite', label: 'Na neodređeno' },
  { value: '1', label: '1 mjesec' },
  { value: '3', label: '3 mjeseca' },
  { value: '6', label: '6 mjeseci' },
  { value: '12', label: '12 mjeseci' },
  { value: 'custom', label: 'Prilagođeno (ručni datum)' },
] as const;

export default function EmploymentContracts() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const columnPanelRef = useRef<HTMLDivElement>(null);
  const [showColumns, setShowColumns] = useState(false);
  const [columnPrefs, setColumnPrefs] = useState<ColumnPrefs>(() => loadColumnPrefs(userId));
  const [filters, setFilters] = useState<EmploymentContractFilters>({});
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renewTarget, setRenewTarget] = useState<EmploymentContract | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmploymentContractTemplate | null>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkForm, setBulkForm] = useState({
    term_preset: '3' as string,
    duration_from: 'work_start' as 'work_start' | 'effective' | 'today',
    custom_expiry_date: '',
    status: '' as string,
    auto_renew: '' as '' | '1' | '0',
    renewal_notice_days: '',
    salary_gross: '',
    salary_net: '',
    store_id: '',
    notes: '',
    generate_document: false,
  });

  const [createForm, setCreateForm] = useState({
    employee_id: '',
    template_id: '',
    store_id: '',
    contract_number: '',
    contract_sign_date: new Date().toISOString().slice(0, 10),
    work_start_date: new Date().toISOString().slice(0, 10),
    work_end_date: '',
    effective_date: new Date().toISOString().slice(0, 10),
    expiry_date: '',
    salary_gross: '',
    salary_net: '',
    employee_full_name: '',
    employee_address: '',
    employee_education: '',
    employee_origin: '',
    position_title: '',
    store_name: '',
    store_city: '',
    renewal_notice_days: '',
    employment_term: 'indefinite' as 'indefinite' | 'fixed',
    auto_renew: true,
    generate_document: true,
  });

  const [renewForm, setRenewForm] = useState({
    renewal_end_date: '',
    contract_sign_date: new Date().toISOString().slice(0, 10),
    effective_date: '',
    salary_gross: '',
    salary_net: '',
    protocol_number: '',
    notes: '',
    generate_document: true,
  });

  const [settingsForm, setSettingsForm] = useState<EmploymentContractSettings>(DEFAULT_CONTRACT_SETTINGS);

  const activeFilters = useMemo(
    () => ({ ...filters, search: search || undefined }),
    [filters, search]
  );

  const { data: contractsData, isLoading } = useQuery({
    queryKey: ['hrm-employment-contracts', activeFilters],
    queryFn: () => getEmploymentContracts(activeFilters),
  });

  const { data: summary } = useQuery({
    queryKey: ['hrm-employment-contracts-summary'],
    queryFn: getEmploymentContractSummary,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['hrm-employment-contract-templates', showTemplates],
    queryFn: () => getEmploymentContractTemplates(showTemplates),
  });

  const { data: settings } = useQuery({
    queryKey: ['hrm-employment-contract-settings'],
    queryFn: getEmploymentContractSettings,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['hrm-employees-contract-select'],
    queryFn: () => getEmployees({ per_page: 200 }),
    enabled: showCreate,
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['hrm-stores-contract-select'],
    queryFn: getStores,
  });

  const contracts = contractsData?.data || [];
  const employees = employeesData?.data || [];
  const contractsByEmployee = useMemo(() => {
    const counts = new Map<number, number>();
    contracts.forEach((contract) => {
      counts.set(contract.employee_id, (counts.get(contract.employee_id) || 0) + 1);
    });
    return counts;
  }, [contracts]);
  const visibleColumns = useMemo(
    () =>
      columnPrefs.order
        .filter((id) => columnPrefs.visible.includes(id))
        .map((id) => CONTRACT_COLUMNS.find((column) => column.id === id))
        .filter((column): column is (typeof CONTRACT_COLUMNS)[number] => Boolean(column)),
    [columnPrefs]
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    contracts.length > 0 && contracts.every((contract) => selectedIdSet.has(contract.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !contracts.some((c) => c.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      contracts.forEach((c) => next.add(c.id));
      return Array.from(next);
    });
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const createMutation = useMutation({
    mutationFn: createEmploymentContract,
    onSuccess: () => {
      toast.success('Ugovor je kreiran.');
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts-summary'] });
      setShowCreate(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri kreiranju ugovora.');
    },
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      renewEmploymentContract(id, payload),
    onSuccess: () => {
      toast.success('Novi ugovor je kreiran produženjem.');
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts-summary'] });
      setRenewTarget(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri produženju ugovora.');
    },
  });

  const settingsMutation = useMutation({
    mutationFn: updateEmploymentContractSettings,
    onSuccess: () => {
      toast.success('Postavke su sačuvane.');
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contract-settings'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts-summary'] });
      setShowSettings(false);
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateEmploymentContractDocument,
    onSuccess: () => {
      toast.success('Dokument je generisan.');
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts'] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateEmploymentContracts,
    onSuccess: (result) => {
      toast.success(result.message || `Ažurirano: ${result.updated}`);
      if (result.failed?.length) {
        toast.error(`Neuspješno: ${result.failed.length}`);
      }
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contracts-summary'] });
      setSelectedIds([]);
      setShowBulkEdit(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri masovnoj izmjeni.');
    },
  });

  const handleBulkUpdate = () => {
    if (selectedIds.length === 0) {
      toast.error('Odaberite barem jedan ugovor.');
      return;
    }

    const payload: Parameters<typeof bulkUpdateEmploymentContracts>[0] = {
      ids: selectedIds,
      generate_document: bulkForm.generate_document,
    };

    if (bulkForm.term_preset === 'indefinite') {
      payload.employment_term = 'indefinite';
    } else if (bulkForm.term_preset === 'custom') {
      if (!bulkForm.custom_expiry_date) {
        toast.error('Unesite datum isteka za prilagođeno trajanje.');
        return;
      }
      payload.employment_term = 'fixed';
      payload.expiry_date = bulkForm.custom_expiry_date;
      payload.work_end_date = bulkForm.custom_expiry_date;
    } else if (bulkForm.term_preset) {
      payload.duration_months = Number(bulkForm.term_preset);
      payload.duration_from = bulkForm.duration_from;
    }

    if (bulkForm.status) payload.status = bulkForm.status;
    if (bulkForm.auto_renew !== '') payload.auto_renew = bulkForm.auto_renew === '1';
    if (bulkForm.renewal_notice_days) {
      payload.renewal_notice_days = Number(bulkForm.renewal_notice_days);
    }
    if (bulkForm.salary_gross) payload.salary_gross = Number(bulkForm.salary_gross);
    if (bulkForm.salary_net) payload.salary_net = Number(bulkForm.salary_net);
    if (bulkForm.store_id) payload.store_id = Number(bulkForm.store_id);
    if (bulkForm.notes.trim()) payload.notes = bulkForm.notes.trim();

    const hasChange =
      payload.employment_term !== undefined ||
      payload.duration_months !== undefined ||
      payload.status !== undefined ||
      payload.auto_renew !== undefined ||
      payload.renewal_notice_days !== undefined ||
      payload.salary_gross !== undefined ||
      payload.salary_net !== undefined ||
      payload.store_id !== undefined ||
      payload.notes !== undefined ||
      payload.expiry_date !== undefined;

    if (!hasChange) {
      toast.error('Odaberite barem jedno polje za izmjenu.');
      return;
    }

    bulkUpdateMutation.mutate(payload);
  };

  const openBulkEdit = () => {
    if (selectedIds.length === 0) {
      toast.error('Odaberite ugovore koje želite izmijeniti.');
      return;
    }
    setBulkForm({
      term_preset: '',
      duration_from: 'work_start',
      custom_expiry_date: '',
      status: '',
      auto_renew: '',
      renewal_notice_days: '',
      salary_gross: '',
      salary_net: '',
      store_id: '',
      notes: '',
      generate_document: false,
    });
    setShowBulkEdit(true);
  };

  const handleCreate = () => {
    createMutation.mutate({
      employee_id: Number(createForm.employee_id),
      template_id: Number(createForm.template_id),
      store_id: createForm.store_id ? Number(createForm.store_id) : undefined,
      contract_number: createForm.contract_number || undefined,
      contract_sign_date: createForm.contract_sign_date,
      work_start_date: createForm.work_start_date,
      work_end_date: createForm.work_end_date || undefined,
      effective_date: createForm.effective_date,
      expiry_date: createForm.expiry_date || createForm.work_end_date || undefined,
      salary_gross: createForm.salary_gross ? Number(createForm.salary_gross) : undefined,
      salary_net: createForm.salary_net ? Number(createForm.salary_net) : undefined,
      employee_full_name: createForm.employee_full_name || undefined,
      employee_address: createForm.employee_address || undefined,
      employee_education: createForm.employee_education || undefined,
      employee_origin: createForm.employee_origin || undefined,
      position_title: createForm.position_title || undefined,
      store_name: createForm.store_name || undefined,
      store_city: createForm.store_city || undefined,
      renewal_notice_days: createForm.renewal_notice_days
        ? Number(createForm.renewal_notice_days)
        : undefined,
      employment_term: createForm.employment_term,
      auto_renew: createForm.auto_renew,
      generate_document: createForm.generate_document,
      status: 'active',
    });
  };

  const handleRenew = () => {
    if (!renewTarget) return;
    renewMutation.mutate({
      id: renewTarget.id,
      payload: {
        renewal_end_date: renewForm.renewal_end_date,
        contract_sign_date: renewForm.contract_sign_date,
        effective_date: renewForm.effective_date || renewForm.renewal_end_date,
        salary_gross: renewForm.salary_gross ? Number(renewForm.salary_gross) : undefined,
        salary_net: renewForm.salary_net ? Number(renewForm.salary_net) : undefined,
        protocol_number: renewForm.protocol_number || undefined,
        notes: renewForm.notes || undefined,
        generate_document: renewForm.generate_document,
      },
    });
  };

  const openCreate = () => {
    const current = settingsToForm(settings);
    const today = new Date().toISOString().slice(0, 10);
    const fixed = current.default_employment_term === 'fixed';
    const end = fixed ? addMonths(today, current.default_fixed_months || 12) : '';
    setCreateForm((prev) => ({
      ...prev,
      contract_sign_date: today,
      work_start_date: today,
      effective_date: today,
      employment_term: current.default_employment_term,
      work_end_date: end,
      expiry_date: end,
      auto_renew: current.default_auto_renew,
      generate_document: current.generate_document_by_default,
      renewal_notice_days: String(current.default_renewal_notice_days),
    }));
    setShowTemplateList(false);
    setShowCreate(true);
  };

  const openRenew = (contract: EmploymentContract) => {
    setRenewTarget(contract);
    setRenewForm({
      renewal_end_date: '',
      contract_sign_date: new Date().toISOString().slice(0, 10),
      effective_date: '',
      salary_gross: contract.salary_gross?.toString() || '',
      salary_net: contract.salary_net?.toString() || '',
      protocol_number: contract.protocol_number || '',
      notes: '',
      generate_document: settingsToForm(settings).generate_document_by_default,
    });
  };

  const openSettings = () => {
    setSettingsForm(settingsToForm(settings));
    setShowSettings(true);
  };

  useEffect(() => {
    setColumnPrefs(loadColumnPrefs(userId));
  }, [userId]);

  useEffect(() => {
    if (!showColumns) return;
    const close = (event: MouseEvent) => {
      if (!columnPanelRef.current?.contains(event.target as Node)) {
        setShowColumns(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showColumns]);

  const saveColumnPrefs = (next: ColumnPrefs) => {
    setColumnPrefs(next);
    localStorage.setItem(columnStorageKey(userId), JSON.stringify(next));
  };

  const toggleColumn = (id: ContractColumnId) => {
    const visible = columnPrefs.visible.includes(id)
      ? columnPrefs.visible.filter((item) => item !== id)
      : [...columnPrefs.visible, id];
    if (visible.length === 0) {
      toast.error('Ostaje barem jedna kolona.');
      return;
    }
    saveColumnPrefs({ ...columnPrefs, visible });
  };

  const moveColumn = (id: ContractColumnId, direction: -1 | 1) => {
    const order = [...columnPrefs.order];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    saveColumnPrefs({ ...columnPrefs, order });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ugovori o radu</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            FBiH, RS i BD — praćenje, produženje i generisanje dokumenata iz šablona.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowTemplateList((open) => !open)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              showTemplateList
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Šabloni
          </button>
          <button
            type="button"
            onClick={openSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <Settings className="h-4 w-4" />
            Postavke
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novi ugovor
          </button>
        </div>
      </div>

      {showTemplateList && (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Šabloni ugovora</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Aktivni šabloni dostupni za kreiranje ugovora ({templates.filter((t) => t.is_active).length})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
          >
            <Upload className="h-3.5 w-3.5" />
            Učitaj / upravljaj
          </button>
        </div>
        {templatesLoading ? (
          <div className="flex h-16 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : templates.filter((t) => t.is_active).length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nema aktivnih šablona. Učitajte Word/PDF šablon da bi bio dostupan.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {templates
              .filter((t) => t.is_active)
              .map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{template.name}</p>
                    <p className="text-xs text-gray-500">
                      {LEGAL_ENTITY_LABELS[template.legal_entity]} · {JOB_ROLE_LABELS[template.job_role]} ·{' '}
                      {template.output_format.toUpperCase()}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {template.file_name || template.template_file}
                      {template.file_exists === false ? ' (datoteka nedostaje)' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      title="Pregled šablona"
                      onClick={() => setPreviewTemplate(template)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-teal-600 dark:hover:bg-gray-800"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Preuzmi šablon"
                      onClick={() =>
                        downloadEmploymentContractTemplate(
                          template.id,
                          template.file_name || template.template_file
                        )
                      }
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 dark:hover:bg-gray-800"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <SummaryChip label="Ukupno" value={summary?.total ?? 0} tone="blue" />
          <SummaryChip label="Aktivni" value={summary?.active ?? 0} tone="green" />
          <SummaryChip label="Uskoro ističu" value={summary?.expiring_soon ?? 0} tone="amber" />
          <SummaryChip label="Nacrti" value={summary?.draft ?? 0} tone="slate" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraga po zaposleniku, broju, prodavnici..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-2 text-xs dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <select
            value={filters.legal_entity || ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, legal_entity: (e.target.value || undefined) as LegalEntity | undefined }))
            }
            className={filterControl}
          >
            <option value="">Entitet</option>
            <option value="fbih">FBiH</option>
            <option value="rs">RS</option>
            <option value="bd">BD</option>
          </select>
          <select
            value={filters.job_role || ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, job_role: (e.target.value || undefined) as JobRole | undefined }))
            }
            className={filterControl}
          >
            <option value="">Pozicija</option>
            <option value="store_manager">Šef prodavnice</option>
            <option value="deputy_manager">Zamjenik šefa</option>
            <option value="salesperson">Prodavač</option>
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))}
            className={filterControl}
          >
            <option value="">Status</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filters.store_id || ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                store_id: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className={filterControl}
          >
            <option value="">Prodavnica</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <label
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
              filters.expiring_within_days
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200'
                : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            Ističu u
            <input
              type="number"
              min={1}
              max={365}
              value={filters.expiring_within_days ?? ''}
              placeholder="30"
              onChange={(e) => {
                const raw = e.target.value;
                const days = Number(raw);
                setFilters((prev) => ({
                  ...prev,
                  expiring_within_days: raw && Number.isFinite(days) ? Math.min(365, Math.max(1, days)) : undefined,
                }));
              }}
              className="w-12 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-center text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            dana
          </label>
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setSearch('');
              setSelectedIds([]);
            }}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Očisti
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Odabrano ugovora: <strong>{selectedIds.length}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs text-blue-700 dark:border-blue-700 dark:bg-transparent dark:text-blue-200"
            >
              Poništi odabir
            </button>
            <button
              type="button"
              onClick={openBulkEdit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Promijeni sve odjednom
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Pregled ugovora</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Broj ugovora je zasebna kolona. Ako radnik ima više ugovora, uz ime stoji njihov broj u ovom prikazu.
            </p>
          </div>
          <div className="relative" ref={columnPanelRef}>
            <button
              type="button"
              onClick={() => setShowColumns((open) => !open)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Kolone
            </button>
            {showColumns && (
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Prikaz kolona</p>
                  <button
                    type="button"
                    onClick={() => saveColumnPrefs(defaultColumnPrefs())}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Vrati zadano
                  </button>
                </div>
                <p className="mb-2 text-xs text-gray-500">
                  Svaki nalog pamti svoj raspored. Odabir i akcije ostaju uvijek vidljivi.
                </p>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {columnPrefs.order.map((id, index) => {
                    const column = CONTRACT_COLUMNS.find((item) => item.id === id);
                    if (!column) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                          type="checkbox"
                          checked={columnPrefs.visible.includes(id)}
                          onChange={() => toggleColumn(id)}
                          aria-label={column.label}
                        />
                        <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{column.label}</span>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveColumn(id, -1)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                          aria-label={`Pomjeri ${column.label} gore`}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === columnPrefs.order.length - 1}
                          onClick={() => moveColumn(id, 1)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                          aria-label={`Pomjeri ${column.label} dolje`}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
            Nema evidentiranih ugovora za odabrane filtere.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={excelHeadClass}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Odaberi sve"
                    />
                  </th>
                  {visibleColumns.map((column) => (
                    <th key={column.id} className={`${excelHeadClass} whitespace-nowrap`}>
                      {column.label}
                    </th>
                  ))}
                  <th className={`${excelHeadClass} text-center`}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract, index) => {
                  const selected = selectedIdSet.has(contract.id);
                  const rowClass = selected
                    ? 'bg-[#d6e6f8] dark:bg-blue-900/40'
                    : index % 2 === 0
                      ? 'bg-white dark:bg-gray-800'
                      : 'bg-[#f4f7fb] dark:bg-gray-900/50';
                  return (
                    <tr key={contract.id} className={`${rowClass} hover:bg-[#e7f0fb] dark:hover:bg-blue-900/25`}>
                      <td className={`${excelCellClass} text-center`}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelectOne(contract.id)}
                          aria-label={`Odaberi ugovor ${contract.contract_number || contract.id}`}
                        />
                      </td>
                      {visibleColumns.map((column) => (
                        <td key={column.id} className={`${excelCellClass} whitespace-nowrap`}>
                          {renderContractCell(column.id, contract, contractsByEmployee.get(contract.employee_id) || 1)}
                        </td>
                      ))}
                      <td className={`${excelCellClass} text-center`}>
                        <div className="flex items-center justify-center gap-1">
                          <IconAction
                            label="Produži"
                            onClick={() => openRenew(contract)}
                            className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </IconAction>
                          <IconAction
                            label="Generiši dokument"
                            onClick={() => generateMutation.mutate(contract.id)}
                            className="text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
                          >
                            <FilePlus className="h-4 w-4" />
                          </IconAction>
                          {contract.generated_document_path && (
                            <IconAction
                              label="Preuzmi dokument"
                              onClick={() => downloadEmploymentContractDocument(contract.id)}
                              className="text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              <Download className="h-4 w-4" />
                            </IconAction>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="Novi ugovor o radu" onClose={() => setShowCreate(false)}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Zaposlenik">
              <select
                value={createForm.employee_id}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                className="input"
              >
                <option value="">Odaberi zaposlenika</option>
                {employees.map((employee: any) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Šablon">
              <select
                value={createForm.template_id}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, template_id: e.target.value }))}
                className="input"
              >
                <option value="">Odaberi šablon</option>
                {templates
                  .filter((template) => template.is_active)
                  .map((template: EmploymentContractTemplate) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prodavnica">
              <select
                value={createForm.store_id}
                onChange={(e) => {
                  const store = stores.find((item) => item.id === Number(e.target.value));
                  setCreateForm((prev) => ({
                    ...prev,
                    store_id: e.target.value,
                    store_name: store?.name || prev.store_name,
                    store_city: store?.city || prev.store_city,
                  }));
                }}
                className="input"
              >
                <option value="">Odaberi prodavnicu</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Broj ugovora">
              <input
                value={createForm.contract_number}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, contract_number: e.target.value }))}
                className="input"
                placeholder={
                  settings?.contract_number_prefix
                    ? `${settings.contract_number_prefix}${String(settings.contract_number_next || 1).padStart(4, '0')}`
                    : 'Ručni unos'
                }
              />
            </Field>
            <Field label="Datum potpisa">
              <input
                type="date"
                value={createForm.contract_sign_date}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, contract_sign_date: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Početak rada">
              <input
                type="date"
                value={createForm.work_start_date}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, work_start_date: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Datum isteka">
              <input
                type="date"
                value={createForm.expiry_date}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    expiry_date: e.target.value,
                    work_end_date: e.target.value,
                  }))
                }
                className="input"
              />
            </Field>
            <Field label="Trajanje">
              <select
                value={createForm.employment_term}
                onChange={(e) => {
                  const term = e.target.value as 'indefinite' | 'fixed';
                  const months = settingsToForm(settings).default_fixed_months || 12;
                  setCreateForm((prev) => {
                    if (term === 'indefinite') {
                      return { ...prev, employment_term: term, expiry_date: '', work_end_date: '' };
                    }
                    const end = prev.expiry_date || addMonths(prev.work_start_date, months);
                    return { ...prev, employment_term: term, expiry_date: end, work_end_date: end };
                  });
                }}
                className="input"
              >
                <option value="indefinite">Na neodređeno</option>
                <option value="fixed">Na određeno</option>
              </select>
            </Field>
            <Field label="Bruto plata">
              <input
                value={createForm.salary_gross}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, salary_gross: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Neto plata">
              <input
                value={createForm.salary_net}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, salary_net: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Ime i prezime (ručno)">
              <input
                value={createForm.employee_full_name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, employee_full_name: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Adresa">
              <input
                value={createForm.employee_address}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, employee_address: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Obrazovanje">
              <input
                value={createForm.employee_education}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, employee_education: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Upozorenje (dana prije isteka)">
              <input
                value={createForm.renewal_notice_days}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, renewal_notice_days: e.target.value }))}
                className="input"
                placeholder={String(settings?.default_renewal_notice_days || 30)}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createForm.auto_renew}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, auto_renew: e.target.checked }))}
              />
              Automatsko produženje
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createForm.generate_document}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, generate_document: e.target.checked }))}
              />
              Generiši dokument odmah nakon kreiranja
            </label>
            {settings?.contract_number_prefix ? (
              <p className="text-xs text-gray-500">
                Prazan broj ugovora dobija sljedeći broj iz postavki.
              </p>
            ) : null}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
              Odustani
            </button>
            <button type="button" onClick={handleCreate} className="btn-primary">
              Sačuvaj ugovor
            </button>
          </div>
        </Modal>
      )}

      {renewTarget && (
        <Modal title={`Produženje ugovora — ${renewTarget.employee_full_name || renewTarget.employee_user_name}`} onClose={() => setRenewTarget(null)}>
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <div className="flex items-start gap-2 font-medium">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Novi ugovor preuzima podatke prethodnog. Prethodni se označava kao zamijenjen.
                {settingsToForm(settings).auto_create_renewal_draft
                  ? ' Produženje ostaje nacrt dok ga ne aktivirate.'
                  : ' Produženje se odmah aktivira.'}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Produženo do *">
              <input
                type="date"
                value={renewForm.renewal_end_date}
                onChange={(e) => setRenewForm((prev) => ({ ...prev, renewal_end_date: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Datum potpisa novog ugovora">
              <input
                type="date"
                value={renewForm.contract_sign_date}
                onChange={(e) => setRenewForm((prev) => ({ ...prev, contract_sign_date: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Primjena od">
              <input
                type="date"
                value={renewForm.effective_date}
                onChange={(e) => setRenewForm((prev) => ({ ...prev, effective_date: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Bruto plata">
              <input
                value={renewForm.salary_gross}
                onChange={(e) => setRenewForm((prev) => ({ ...prev, salary_gross: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Neto plata">
              <input
                value={renewForm.salary_net}
                onChange={(e) => setRenewForm((prev) => ({ ...prev, salary_net: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Broj protokola">
              <input
                value={renewForm.protocol_number}
                onChange={(e) => setRenewForm((prev) => ({ ...prev, protocol_number: e.target.value }))}
                className="input"
              />
            </Field>
            <Field label="Napomena" className="md:col-span-2">
              <textarea
                value={renewForm.notes}
                onChange={(e) => setRenewForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="input min-h-[80px]"
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={renewForm.generate_document}
              onChange={(e) => setRenewForm((prev) => ({ ...prev, generate_document: e.target.checked }))}
            />
            Generiši dokument produženja
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setRenewTarget(null)} className="btn-secondary">
              Odustani
            </button>
            <button
              type="button"
              disabled={!renewForm.renewal_end_date || renewMutation.isPending}
              onClick={handleRenew}
              className="btn-primary"
            >
              Kreiraj produženje
            </button>
          </div>
        </Modal>
      )}

      {showBulkEdit && (
        <Modal title={`Masovna izmjena — ${selectedIds.length} ugovora`} onClose={() => setShowBulkEdit(false)}>
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            Izmjene se primjenjuju na sve odabrane ugovore odjednom. Prazna polja ostaju nepromijenjena.
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Trajanje / tip ugovora">
              <select
                value={bulkForm.term_preset}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, term_preset: e.target.value }))}
                className="input"
              >
                {TERM_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </Field>
            {['1', '3', '6', '12'].includes(bulkForm.term_preset) && (
              <Field label="Računaj istek od">
                <select
                  value={bulkForm.duration_from}
                  onChange={(e) =>
                    setBulkForm((prev) => ({
                      ...prev,
                      duration_from: e.target.value as 'work_start' | 'effective' | 'today',
                    }))
                  }
                  className="input"
                >
                  <option value="work_start">Datuma početka rada</option>
                  <option value="effective">Datuma primjene</option>
                  <option value="today">Današnjeg datuma</option>
                </select>
              </Field>
            )}
            {bulkForm.term_preset === 'custom' && (
              <Field label="Datum isteka *">
                <input
                  type="date"
                  value={bulkForm.custom_expiry_date}
                  onChange={(e) =>
                    setBulkForm((prev) => ({ ...prev, custom_expiry_date: e.target.value }))
                  }
                  className="input"
                />
              </Field>
            )}
            <Field label="Status (opcionalno)">
              <select
                value={bulkForm.status}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, status: e.target.value }))}
                className="input"
              >
                <option value="">Bez promjene</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Automatsko produženje">
              <select
                value={bulkForm.auto_renew}
                onChange={(e) =>
                  setBulkForm((prev) => ({
                    ...prev,
                    auto_renew: e.target.value as '' | '1' | '0',
                  }))
                }
                className="input"
              >
                <option value="">Bez promjene</option>
                <option value="1">Da</option>
                <option value="0">Ne</option>
              </select>
            </Field>
            <Field label="Upozorenje (dana prije isteka)">
              <input
                type="number"
                min={1}
                max={365}
                value={bulkForm.renewal_notice_days}
                onChange={(e) =>
                  setBulkForm((prev) => ({ ...prev, renewal_notice_days: e.target.value }))
                }
                className="input"
                placeholder="Bez promjene"
              />
            </Field>
            <Field label="Prodavnica">
              <select
                value={bulkForm.store_id}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, store_id: e.target.value }))}
                className="input"
              >
                <option value="">Bez promjene</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bruto plata">
              <input
                value={bulkForm.salary_gross}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, salary_gross: e.target.value }))}
                className="input"
                placeholder="Bez promjene"
              />
            </Field>
            <Field label="Neto plata">
              <input
                value={bulkForm.salary_net}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, salary_net: e.target.value }))}
                className="input"
                placeholder="Bez promjene"
              />
            </Field>
            <Field label="Napomena" className="md:col-span-2">
              <textarea
                value={bulkForm.notes}
                onChange={(e) => setBulkForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="input min-h-[80px]"
                placeholder="Bez promjene"
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bulkForm.generate_document}
              onChange={(e) =>
                setBulkForm((prev) => ({ ...prev, generate_document: e.target.checked }))
              }
            />
            Ponovo generiši dokumente nakon izmjene
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowBulkEdit(false)} className="btn-secondary">
              Odustani
            </button>
            <button
              type="button"
              disabled={bulkUpdateMutation.isPending}
              onClick={handleBulkUpdate}
              className="btn-primary"
            >
              {bulkUpdateMutation.isPending
                ? 'Ažuriranje...'
                : `Primijeni na ${selectedIds.length} ugovora`}
            </button>
          </div>
        </Modal>
      )}

      {showSettings && (
        <Modal title="Postavke ugovora" onClose={() => setShowSettings(false)} wide>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Sačuvane vrijednosti ulaze u novi ugovor, produženje, brojač i tekst generisanog dokumenta.
          </p>
          <div className="space-y-5">
            <SettingsGroup title="Rokovi i produženje">
              <Field label="Upozorenje prije isteka (dana)">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settingsForm.default_renewal_notice_days}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      default_renewal_notice_days: Number(e.target.value) || 1,
                    }))
                  }
                  className="input"
                />
              </Field>
              <label className="flex items-start gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settingsForm.auto_create_renewal_draft}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      auto_create_renewal_draft: e.target.checked,
                    }))
                  }
                />
                <span>
                  Produženje ostaje nacrt
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Isključeno: novi ugovor se odmah aktivira, a prethodni postaje zamijenjen.
                  </span>
                </span>
              </label>
            </SettingsGroup>

            <SettingsGroup title="Podrazumijevani novi ugovor">
              <Field label="Trajanje">
                <select
                  value={settingsForm.default_employment_term}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      default_employment_term: e.target.value as 'indefinite' | 'fixed',
                    }))
                  }
                  className="input"
                >
                  <option value="indefinite">Na neodređeno</option>
                  <option value="fixed">Na određeno</option>
                </select>
              </Field>
              <Field label="Trajanje određenog (mjeseci)">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settingsForm.default_fixed_months}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      default_fixed_months: Number(e.target.value) || 1,
                    }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Valuta">
                <input
                  value={settingsForm.default_currency}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, default_currency: e.target.value }))
                  }
                  className="input"
                  maxLength={10}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settingsForm.default_auto_renew}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, default_auto_renew: e.target.checked }))
                  }
                />
                Automatsko produženje
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={settingsForm.generate_document_by_default}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      generate_document_by_default: e.target.checked,
                    }))
                  }
                />
                Generiši dokument čim se ugovor ili produženje sačuva
              </label>
            </SettingsGroup>

            <SettingsGroup title="Broj ugovora">
              <Field label="Prefiks">
                <input
                  value={settingsForm.contract_number_prefix}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, contract_number_prefix: e.target.value }))
                  }
                  className="input"
                  placeholder="UG-2026-"
                  maxLength={40}
                />
              </Field>
              <Field label="Sljedeći redni broj">
                <input
                  type="number"
                  min={1}
                  value={settingsForm.contract_number_next}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      contract_number_next: Number(e.target.value) || 1,
                    }))
                  }
                  className="input"
                />
              </Field>
              <p className="text-xs text-gray-500 md:col-span-2">
                {settingsForm.contract_number_prefix
                  ? `Sljedeći prazan broj: ${settingsForm.contract_number_prefix}${String(settingsForm.contract_number_next).padStart(4, '0')}`
                  : 'Bez prefiksa broj se unosi ručno na ugovoru.'}
              </p>
            </SettingsGroup>

            <SettingsGroup title="Poslodavac na dokumentu">
              <Field label="Naziv poslodavca" className="md:col-span-2">
                <input
                  value={settingsForm.employer_name}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, employer_name: e.target.value }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Adresa" className="md:col-span-2">
                <input
                  value={settingsForm.employer_address}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, employer_address: e.target.value }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Mjesto potpisa">
                <input
                  value={settingsForm.sign_city}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, sign_city: e.target.value }))}
                  className="input"
                  placeholder="Sarajevo"
                />
              </Field>
              <Field label="Direktor / potpisnik">
                <input
                  value={settingsForm.director_name}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, director_name: e.target.value }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Sedmično radno vrijeme (sati)">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settingsForm.weekly_hours}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      weekly_hours: Number(e.target.value) || 1,
                    }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Probni rad (mjeseci)">
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={settingsForm.probation_months}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      probation_months: Number(e.target.value) || 0,
                    }))
                  }
                  className="input"
                />
              </Field>
              <p className="text-xs text-gray-500 md:col-span-2">
                Šablon može koristiti oznake employer_name, employer_address, sign_city, director_name, weekly_hours i probation_months.
              </p>
            </SettingsGroup>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary">
              Odustani
            </button>
            <button
              type="button"
              disabled={settingsMutation.isPending}
              onClick={() => settingsMutation.mutate(settingsForm)}
              className="btn-primary"
            >
              {settingsMutation.isPending ? 'Spremanje...' : 'Sačuvaj'}
            </button>
          </div>
        </Modal>
      )}

      {showTemplates && <ContractTemplatesManager onClose={() => setShowTemplates(false)} />}
      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}

      <style>{`
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(229 231 235); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
        .dark .input { border-color: rgb(55 65 81); background: rgb(17 24 39); color: white; }
        .btn-primary { border-radius: 0.5rem; background: rgb(37 99 235); padding: 0.5rem 0.875rem; font-size: 0.875rem; color: white; }
        .btn-secondary { border-radius: 0.5rem; border: 1px solid rgb(229 231 235); padding: 0.5rem 0.875rem; font-size: 0.875rem; }
      `}</style>
    </div>
  );
}

const filterControl =
  'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900';

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'amber' | 'slate';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    slate: 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs ${tones[tone]}`}>
      <span className="text-sm font-semibold">{value}</span>
      {label}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900 ${wide ? 'max-w-4xl' : 'max-w-3xl'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h4>
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Zatvori
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const excelHeadClass =
  'sticky top-0 z-10 border border-gray-300 bg-[#f2f2f2] px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200';
const excelCellClass =
  'border border-gray-300 px-2.5 py-1.5 align-middle text-gray-800 dark:border-gray-600 dark:text-gray-100';

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
        <span
          className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full rounded bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          {label}
        </span>
      )}
    </>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <h5 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h5>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}
