import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
  Download,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  deleteEmploymentContractTemplate,
  downloadEmploymentContractTemplate,
  fetchEmploymentContractTemplatePreview,
  getEmploymentContractTemplates,
  replaceEmploymentContractTemplateFile,
  updateEmploymentContractTemplate,
  uploadEmploymentContractTemplate,
  type EmploymentContractTemplatePreview,
} from '@/services/hrmService';
import type { EmploymentContractTemplate, JobRole, LegalEntity } from '@/types/hrm';

const ENTITY_OPTIONS: Array<{ value: LegalEntity; label: string }> = [
  { value: 'fbih', label: 'FBiH' },
  { value: 'rs', label: 'RS' },
  { value: 'bd', label: 'BD' },
];

const ROLE_OPTIONS: Array<{ value: JobRole; label: string }> = [
  { value: 'salesperson', label: 'Prodavač' },
  { value: 'store_manager', label: 'Šef prodavnice' },
  { value: 'deputy_manager', label: 'Zamjenik šefa' },
];

const KIND_OPTIONS = [
  { value: 'full_contract' as const, label: 'Ugovor' },
  { value: 'annex' as const, label: 'Aneks' },
];

const ENTITY_LABELS: Record<LegalEntity, string> = { fbih: 'FBiH', rs: 'RS', bd: 'BD' };
const ROLE_LABELS: Record<JobRole, string> = {
  salesperson: 'Prodavač',
  store_manager: 'Šef prodavnice',
  deputy_manager: 'Zamjenik šefa',
};

const ACCEPT =
  '.doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf';

function formatFileSize(bytes?: number | null) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function emptyForm() {
  return {
    name: '',
    legal_entity: 'fbih' as LegalEntity,
    job_role: 'salesperson' as JobRole,
    document_kind: 'full_contract' as 'full_contract' | 'annex',
    file: null as File | null,
  };
}

export default function ContractTemplatesManager({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<'' | LegalEntity>('');
  const [previewTemplate, setPreviewTemplate] = useState<EmploymentContractTemplate | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['hrm-employment-contract-templates', true],
    queryFn: () => getEmploymentContractTemplates(true),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['hrm-employment-contract-templates'] });
  };

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      uploadEmploymentContractTemplate(formData, (progress) => setUploadProgress(progress)),
    onSuccess: (result) => {
      toast.success(result.message || 'Šablon je dodat.');
      setForm(emptyForm());
      setFileKey((key) => key + 1);
      setUploadProgress(null);
      refresh();
    },
    onError: (error: any) => {
      setUploadProgress(null);
      toast.error(error?.response?.data?.message || 'Greška pri dodavanju šablona.');
    },
  });

  const replaceMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: FormData }) =>
      replaceEmploymentContractTemplateFile(id, formData, (progress) => setUploadProgress(progress)),
    onSuccess: (result) => {
      toast.success(result.message || 'Datoteka šablona je zamijenjena.');
      setUploadProgress(null);
      setReplaceTargetId(null);
      refresh();
    },
    onError: (error: any) => {
      setUploadProgress(null);
      setReplaceTargetId(null);
      toast.error(error?.response?.data?.message || 'Greška pri zamjeni datoteke.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateEmploymentContractTemplate(id, { is_active }),
    onSuccess: () => {
      toast.success('Status šablona je ažuriran.');
      refresh();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju šablona.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmploymentContractTemplate,
    onSuccess: (result) => {
      toast.success(result.message || 'Šablon je obrisan.');
      refresh();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Šablon nije obrisan.');
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((template) => {
      if (entityFilter && template.legal_entity !== entityFilter) return false;
      if (!q) return true;
      return (
        template.name.toLowerCase().includes(q) ||
        template.code.toLowerCase().includes(q) ||
        (template.file_name || '').toLowerCase().includes(q)
      );
    });
  }, [templates, query, entityFilter]);

  const assignFile = (file: File | null) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['doc', 'docx', 'pdf'].includes(ext)) {
      toast.error('Dozvoljeni formati su DOC, DOCX i PDF.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      file,
      name: prev.name.trim() ? prev.name : file.name.replace(/\.[^.]+$/, ''),
    }));
  };

  const submit = () => {
    if (!form.file) {
      toast.error('Odaberite datoteku šablona.');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Unesite naziv šablona.');
      return;
    }
    const ext = form.file.name.split('.').pop()?.toLowerCase();
    const formData = new FormData();
    formData.append('file', form.file);
    formData.append('name', form.name.trim());
    formData.append('legal_entity', form.legal_entity);
    formData.append('job_role', form.job_role);
    formData.append('document_kind', form.document_kind);
    formData.append('output_format', ext === 'pdf' ? 'pdf' : 'docx');
    formData.append('is_active', '1');
    uploadMutation.mutate(formData);
  };

  const replaceFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const id = replaceTargetId;
    event.target.value = '';
    if (!file || !id) return;
    const formData = new FormData();
    formData.append('file', file);
    replaceMutation.mutate({ id, formData });
  };

  const remove = (template: EmploymentContractTemplate) => {
    if ((template.contracts_count ?? 0) > 0) {
      toast.error('Šablon se koristi u ugovorima. Možete ga samo deaktivirati.');
      return;
    }
    if (!window.confirm(`Obrisati šablon „${template.name}”?`)) return;
    deleteMutation.mutate(template.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[100vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl dark:bg-slate-950 sm:max-h-[92vh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
              Ljudski resursi
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Šabloni ugovora</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Dodajte Word ili PDF, pregledajte sadržaj i obrišite šablone koji se ne koriste.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            aria-label="Zatvori"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[340px_minmax(0,1fr)]">
          <form
            className="space-y-4 border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:border-b-0 lg:border-r"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Novi šablon</h4>
              <p className="mt-1 text-xs text-slate-500">Naziv se popuni iz imena datoteke.</p>
            </div>

            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                assignFile(event.dataTransfer.files?.[0] || null);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-7 text-center transition ${
                dragOver
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                  : 'border-slate-300 bg-slate-50 hover:border-teal-400 dark:border-slate-700 dark:bg-slate-950'
              }`}
            >
              <input
                key={fileKey}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(event) => assignFile(event.target.files?.[0] || null)}
              />
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                <Upload className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {form.file ? form.file.name : 'Prevucite datoteku ili kliknite'}
              </span>
              <span className="mt-1 text-xs text-slate-500">DOC, DOCX ili PDF, do 20 MB</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500">Naziv</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="npr. FBiH — Prodavač"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-teal-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <ChoiceGroup
              label="Entitet"
              value={form.legal_entity}
              options={ENTITY_OPTIONS}
              onChange={(legal_entity) => setForm((prev) => ({ ...prev, legal_entity }))}
            />
            <ChoiceGroup
              label="Pozicija"
              value={form.job_role}
              options={ROLE_OPTIONS}
              onChange={(job_role) => setForm((prev) => ({ ...prev, job_role }))}
            />
            <ChoiceGroup
              label="Vrsta"
              value={form.document_kind}
              options={KIND_OPTIONS}
              onChange={(document_kind) => setForm((prev) => ({ ...prev, document_kind }))}
            />

            {uploadProgress !== null && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Učitavanje</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Dodaj šablon
            </button>
          </form>

          <div className="min-h-0 overflow-y-auto p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pretraga šablona"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div className="flex gap-1.5">
                <FilterChip active={entityFilter === ''} label="Svi" onClick={() => setEntityFilter('')} />
                {ENTITY_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    active={entityFilter === option.value}
                    label={option.label}
                    onClick={() => setEntityFilter(option.value)}
                  />
                ))}
              </div>
            </div>

            <input ref={replaceRef} type="file" accept={ACCEPT} className="hidden" onChange={replaceFile} />

            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Učitavanje šablona
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700">
                Nema šablona za prikaz.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((template) => {
                  const inUse = (template.contracts_count ?? 0) > 0;
                  return (
                    <article
                      key={template.id}
                      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="truncate font-semibold text-slate-900 dark:text-white">{template.name}</h5>
                            <button
                              type="button"
                              onClick={() =>
                                toggleMutation.mutate({ id: template.id, is_active: !template.is_active })
                              }
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                template.is_active
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                              }`}
                            >
                              {template.is_active ? 'Aktivan' : 'Neaktivan'}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {ENTITY_LABELS[template.legal_entity]} · {ROLE_LABELS[template.job_role]} ·{' '}
                            {template.document_kind === 'annex' ? 'Aneks' : 'Ugovor'} ·{' '}
                            {template.output_format.toUpperCase()}
                            {template.file_size ? ` · ${formatFileSize(template.file_size)}` : ''}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {template.file_exists === false ? 'Datoteka nedostaje' : template.file_name || template.template_file}
                            {inUse ? ` · u ${template.contracts_count} ugovora` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <IconButton label="Pregled" onClick={() => setPreviewTemplate(template)}>
                          <Eye className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          label="Preuzmi"
                          onClick={() =>
                            downloadEmploymentContractTemplate(template.id, template.file_name || template.template_file)
                          }
                        >
                          <Download className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          label="Zamijeni"
                          onClick={() => {
                            setReplaceTargetId(template.id);
                            replaceRef.current?.click();
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          label="Obriši"
                          danger
                          disabled={inUse || deleteMutation.isPending}
                          title={inUse ? 'Šablon se koristi u ugovorima' : 'Obriši šablon'}
                          onClick={() => remove(template)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  );
}

export function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: EmploymentContractTemplate;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<EmploymentContractTemplatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setPreview(null);

    fetchEmploymentContractTemplatePreview(template.id)
      .then((result) => {
        if (cancelled) {
          if (result.kind === 'pdf') URL.revokeObjectURL(result.url);
          return;
        }
        if (result.kind === 'pdf') objectUrl = result.url;
        setPreview(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Pregled nije uspio.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [template.id]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
      <div className="flex h-[min(88vh,860px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-400">Pregled šablona</p>
            <h4 className="truncate text-base font-semibold text-slate-900 dark:text-white">{template.name}</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Zatvori pregled"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-slate-100 dark:bg-slate-950">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Otvaranje pregleda
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-rose-600">{error}</div>
          ) : preview?.kind === 'pdf' ? (
            <iframe title={template.name} src={preview.url} className="h-full w-full bg-white" />
          ) : preview?.kind === 'html' ? (
            <article className="h-full overflow-y-auto bg-white px-6 py-6 text-sm leading-7 text-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:px-10">
              {preview.message && !preview.html ? (
                <p className="text-slate-500">{preview.message}</p>
              ) : (
                <div
                  className="[&_p]:mb-3 [&_p]:whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: preview.html || '' }}
                />
              )}
            </article>
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500">
              {preview && 'message' in preview ? preview.message : 'Pregled nije dostupan.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
        active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

function IconButton({
  label,
  children,
  onClick,
  danger,
  disabled,
  title,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title || label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
      }`}
    >
      {children}
      {label}
    </button>
  );
}
