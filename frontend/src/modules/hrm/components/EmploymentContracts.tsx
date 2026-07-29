import { useMemo, useState } from 'react';
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

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('bs-BA');
}

export default function EmploymentContracts() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EmploymentContractFilters>({});
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renewTarget, setRenewTarget] = useState<EmploymentContract | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  const { data: templates = [] } = useQuery({
    queryKey: ['hrm-employment-contract-templates'],
    queryFn: getEmploymentContractTemplates,
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
    enabled: showCreate,
  });

  const contracts = contractsData?.data || [];
  const employees = employeesData?.data || [];

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
            onClick={() => setFilters({})}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Očisti filtere
          </button>
        </div>
      </div>

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
                  <th className="px-4 py-3">Zaposlenik</th>
                  <th className="px-4 py-3">Entitet</th>
                  <th className="px-4 py-3">Pozicija</th>
                  <th className="px-4 py-3">Prodavnica</th>
                  <th className="px-4 py-3">Početak</th>
                  <th className="px-4 py-3">Istek</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {contract.employee_full_name || contract.employee_user_name}
                      </div>
                      <div className="text-xs text-gray-500">{contract.contract_number || 'Bez broja'}</div>
                    </td>
                    <td className="px-4 py-3">{LEGAL_ENTITY_LABELS[contract.legal_entity]}</td>
                    <td className="px-4 py-3">{JOB_ROLE_LABELS[contract.job_role]}</td>
                    <td className="px-4 py-3">{contract.store_label || contract.store_name || '—'}</td>
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
                {templates.map((template: EmploymentContractTemplate) => (
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
