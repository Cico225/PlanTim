import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  RefreshCw,
  Download,
  Filter,
  Settings,
  AlertTriangle,
  Search,
  Upload,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Pencil,
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
  uploadEmploymentContractTemplate,
  replaceEmploymentContractTemplateFile,
  downloadEmploymentContractTemplate,
  updateEmploymentContractTemplate,
  bulkUpdateEmploymentContracts,
  getEmployees,
  getStores,
} from '../../../services/hrmService';
import type {
  EmploymentContract,
  EmploymentContractFilters,
  EmploymentContractTemplate,
  LegalEntity,
  JobRole,
} from '../../../types/hrm';

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

const TERM_PRESETS = [
  { value: '', label: 'Bez promjene trajanja' },
  { value: 'indefinite', label: 'Na neodređeno' },
  { value: '1', label: '1 mjesec' },
  { value: '3', label: '3 mjeseca' },
  { value: '6', label: '6 mjeseci' },
  { value: '12', label: '12 mjeseci' },
  { value: 'custom', label: 'Prilagođeno (ručni datum)' },
] as const;

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('bs-BA');
}

function formatFileSize(bytes?: number | null) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EmploymentContracts() {
  const queryClient = useQueryClient();
  const replaceFileRef = useRef<HTMLInputElement | null>(null);
  const [filters, setFilters] = useState<EmploymentContractFilters>({});
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renewTarget, setRenewTarget] = useState<EmploymentContract | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [replaceTargetId, setReplaceTargetId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
  const [templateForm, setTemplateForm] = useState({
    name: '',
    legal_entity: 'fbih' as LegalEntity,
    job_role: 'salesperson' as JobRole,
    document_kind: 'full_contract' as 'full_contract' | 'annex',
    output_format: 'docx' as 'docx' | 'pdf',
    file: null as File | null,
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

  const [settingsForm, setSettingsForm] = useState({
    default_renewal_notice_days: 30,
    auto_create_renewal_draft: true,
  });

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
    enabled: showSettings,
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

  const uploadTemplateMutation = useMutation({
    mutationFn: (formData: FormData) =>
      uploadEmploymentContractTemplate(formData, (progress) => setUploadProgress(progress)),
    onSuccess: (result) => {
      toast.success(result.message || 'Šablon je učitan.');
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contract-templates'] });
      setUploadProgress(null);
      setTemplateForm({
        name: '',
        legal_entity: 'fbih',
        job_role: 'salesperson',
        document_kind: 'full_contract',
        output_format: 'docx',
        file: null,
      });
    },
    onError: (error: any) => {
      setUploadProgress(null);
      toast.error(error?.response?.data?.message || 'Greška pri učitavanju šablona.');
    },
  });

  const replaceTemplateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      replaceEmploymentContractTemplateFile(id, formData, (progress) => setUploadProgress(progress)),
    onSuccess: (result) => {
      toast.success(result.message || 'Datoteka šablona je ažurirana.');
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contract-templates'] });
      setUploadProgress(null);
      setReplaceTargetId(null);
    },
    onError: (error: any) => {
      setUploadProgress(null);
      setReplaceTargetId(null);
      toast.error(error?.response?.data?.message || 'Greška pri zamjeni datoteke.');
    },
  });

  const toggleTemplateActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateEmploymentContractTemplate(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-employment-contract-templates'] });
      toast.success('Status šablona je ažuriran.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju šablona.');
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

  const handleUploadTemplate = () => {
    if (!templateForm.file) {
      toast.error('Odaberite datoteku šablona (.doc, .docx ili .pdf).');
      return;
    }
    if (!templateForm.name.trim()) {
      toast.error('Unesite naziv šablona.');
      return;
    }

    const formData = new FormData();
    formData.append('file', templateForm.file);
    formData.append('name', templateForm.name.trim());
    formData.append('legal_entity', templateForm.legal_entity);
    formData.append('job_role', templateForm.job_role);
    formData.append('document_kind', templateForm.document_kind);
    formData.append('output_format', templateForm.output_format);
    formData.append('is_active', '1');

    uploadTemplateMutation.mutate(formData);
  };

  const handleReplaceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const id = replaceTargetId;
    event.target.value = '';
    if (!file || !id) return;

    const formData = new FormData();
    formData.append('file', file);
    replaceTemplateMutation.mutate({ id, formData });
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
      generate_document: true,
    });
  };

  const applySettingsToForm = () => {
    if (settings) {
      setSettingsForm({
        default_renewal_notice_days: settings.default_renewal_notice_days,
        auto_create_renewal_draft: settings.auto_create_renewal_draft,
      });
    }
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
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <FolderOpen className="h-4 w-4" />
            Šabloni
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSettings(true);
              applySettingsToForm();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <Settings className="h-4 w-4" />
            Postavke
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novi ugovor
          </button>
        </div>
      </div>

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
                  <button
                    type="button"
                    title="Preuzmi šablon"
                    onClick={() =>
                      downloadEmploymentContractTemplate(
                        template.id,
                        template.file_name || template.template_file
                      )
                    }
                    className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 dark:hover:bg-gray-800"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard label="Ukupno" value={summary?.total ?? 0} tone="blue" />
        <SummaryCard label="Aktivni" value={summary?.active ?? 0} tone="green" />
        <SummaryCard label="Uskoro ističu" value={summary?.expiring_soon ?? 0} tone="amber" />
        <SummaryCard label="Nacrti" value={summary?.draft ?? 0} tone="slate" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <Filter className="h-4 w-4" />
          Filteri
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraga po zaposleniku, broju, prodavnici..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <select
            value={filters.legal_entity || ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, legal_entity: (e.target.value || undefined) as LegalEntity | undefined }))
            }
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
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
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">Pozicija</option>
            <option value="store_manager">Šef prodavnice</option>
            <option value="deputy_manager">Zamjenik šefa</option>
            <option value="salesperson">Prodavač</option>
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
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
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">Prodavnica</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, expiring_within_days: 30 }))}
            className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          >
            Ističu u 30 dana
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setSearch('');
              setSelectedIds([]);
            }}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Očisti filtere
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
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
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Odaberi sve"
                    />
                  </th>
                  <th className="px-4 py-3">Zaposlenik</th>
                  <th className="px-4 py-3">Entitet</th>
                  <th className="px-4 py-3">Pozicija</th>
                  <th className="px-4 py-3">Prodavnica</th>
                  <th className="px-4 py-3">Trajanje</th>
                  <th className="px-4 py-3">Početak</th>
                  <th className="px-4 py-3">Istek</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className={`border-t border-gray-100 dark:border-gray-700 ${
                      selectedIdSet.has(contract.id) ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIdSet.has(contract.id)}
                        onChange={() => toggleSelectOne(contract.id)}
                        aria-label={`Odaberi ugovor ${contract.id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {contract.employee_full_name || contract.employee_user_name}
                      </div>
                      <div className="text-xs text-gray-500">{contract.contract_number || 'Bez broja'}</div>
                    </td>
                    <td className="px-4 py-3">{LEGAL_ENTITY_LABELS[contract.legal_entity]}</td>
                    <td className="px-4 py-3">{JOB_ROLE_LABELS[contract.job_role]}</td>
                    <td className="px-4 py-3">{contract.store_label || contract.store_name || '—'}</td>
                    <td className="px-4 py-3">
                      {contract.employment_term === 'fixed' ? 'Određeno' : 'Neodređeno'}
                    </td>
                    <td className="px-4 py-3">{formatDate(contract.work_start_date)}</td>
                    <td className="px-4 py-3">{formatDate(contract.expiry_date || contract.work_end_date)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700">
                        {STATUS_LABELS[contract.status] || contract.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openRenew(contract)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Produži
                        </button>
                        <button
                          type="button"
                          onClick={() => generateMutation.mutate(contract.id)}
                          className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                        >
                          Generiši
                        </button>
                        {contract.generated_document_path && (
                          <button
                            type="button"
                            onClick={() => downloadEmploymentContractDocument(contract.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Preuzmi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    employment_term: e.target.value as 'indefinite' | 'fixed',
                  }))
                }
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
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createForm.generate_document}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, generate_document: e.target.checked }))}
            />
            Generiši dokument odmah nakon kreiranja
          </label>
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
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Automatski se kreira novi ugovor sa istim podacima osim datuma i ručnih izmjena.
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
        <Modal title="Postavke ugovora" onClose={() => setShowSettings(false)}>
          <div className="space-y-3">
            <Field label="Upozorenje prije isteka (dana)">
              <input
                type="number"
                min={1}
                max={365}
                value={settingsForm.default_renewal_notice_days}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    default_renewal_notice_days: Number(e.target.value),
                  }))
                }
                className="input"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settingsForm.auto_create_renewal_draft}
                onChange={(e) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    auto_create_renewal_draft: e.target.checked,
                  }))
                }
              />
              Automatski kreiraj nacrt produženja
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary">
              Odustani
            </button>
            <button
              type="button"
              onClick={() => settingsMutation.mutate(settingsForm)}
              className="btn-primary"
            >
              Sačuvaj
            </button>
          </div>
        </Modal>
      )}

      {showTemplates && (
        <Modal title="Šabloni ugovora" onClose={() => setShowTemplates(false)}>
          <input
            ref={replaceFileRef}
            type="file"
            accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            className="hidden"
            onChange={handleReplaceFile}
          />

          <div className="mb-5 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-900/10">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-200">
              <Upload className="h-4 w-4" />
              Učitaj novi šablon
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Naziv šablona *">
                <input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="npr. FBiH — Prodavač (novi)"
                />
              </Field>
              <Field label="Datoteka *">
                <input
                  type="file"
                  accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    const ext = file?.name.split('.').pop()?.toLowerCase();
                    setTemplateForm((prev) => ({
                      ...prev,
                      file,
                      name: prev.name || (file ? file.name.replace(/\.[^.]+$/, '') : ''),
                      output_format: ext === 'docx' ? 'docx' : prev.output_format === 'docx' && ext === 'doc' ? 'pdf' : prev.output_format,
                    }));
                  }}
                  className="input"
                />
              </Field>
              <Field label="Entitet">
                <select
                  value={templateForm.legal_entity}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      legal_entity: e.target.value as LegalEntity,
                    }))
                  }
                  className="input"
                >
                  <option value="fbih">FBiH</option>
                  <option value="rs">RS</option>
                  <option value="bd">BD</option>
                </select>
              </Field>
              <Field label="Pozicija">
                <select
                  value={templateForm.job_role}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      job_role: e.target.value as JobRole,
                    }))
                  }
                  className="input"
                >
                  <option value="store_manager">Šef prodavnice</option>
                  <option value="deputy_manager">Zamjenik šefa</option>
                  <option value="salesperson">Prodavač</option>
                </select>
              </Field>
              <Field label="Vrsta dokumenta">
                <select
                  value={templateForm.document_kind}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      document_kind: e.target.value as 'full_contract' | 'annex',
                    }))
                  }
                  className="input"
                >
                  <option value="full_contract">Ugovor o radu</option>
                  <option value="annex">Aneks</option>
                </select>
              </Field>
              <Field label="Izlazni format">
                <select
                  value={templateForm.output_format}
                  onChange={(e) =>
                    setTemplateForm((prev) => ({
                      ...prev,
                      output_format: e.target.value as 'docx' | 'pdf',
                    }))
                  }
                  className="input"
                >
                  <option value="docx">DOCX (popunjavanje šablona)</option>
                  <option value="pdf">PDF (Blade šablon)</option>
                </select>
              </Field>
            </div>
            {uploadProgress !== null && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Učitavanje...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={uploadTemplateMutation.isPending}
                onClick={handleUploadTemplate}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploadTemplateMutation.isPending ? 'Učitavanje...' : 'Učitaj šablon'}
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            {templatesLoading ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Nema učitanih šablona.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-3 py-2">Naziv</th>
                      <th className="px-3 py-2">Entitet</th>
                      <th className="px-3 py-2">Pozicija</th>
                      <th className="px-3 py-2">Datoteka</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900 dark:text-white">{template.name}</div>
                          <div className="text-xs text-gray-400">{template.code}</div>
                        </td>
                        <td className="px-3 py-2">{LEGAL_ENTITY_LABELS[template.legal_entity]}</td>
                        <td className="px-3 py-2">{JOB_ROLE_LABELS[template.job_role]}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {template.file_exists ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-rose-500" />
                            )}
                            <div>
                              <div className="max-w-[160px] truncate text-xs">
                                {template.file_name || template.template_file}
                              </div>
                              <div className="text-xs text-gray-400">
                                {template.output_format.toUpperCase()} · {formatFileSize(template.file_size)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              template.is_active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                            }`}
                          >
                            {template.is_active ? 'Aktivan' : 'Neaktivan'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                downloadEmploymentContractTemplate(
                                  template.id,
                                  template.file_name || template.template_file
                                )
                              }
                              className="rounded-lg bg-gray-100 px-2 py-1 text-xs dark:bg-gray-700"
                            >
                              Preuzmi
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReplaceTargetId(template.id);
                                replaceFileRef.current?.click();
                              }}
                              className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            >
                              Zamijeni
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                toggleTemplateActiveMutation.mutate({
                                  id: template.id,
                                  is_active: !template.is_active,
                                })
                              }
                              className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                            >
                              {template.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
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

function SummaryCard({
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
    slate: 'bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-300',
  };

  return (
    <div className={`rounded-xl p-4 text-center ${tones[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
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
