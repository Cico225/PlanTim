import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiEdit2,
  FiFile,
  FiFileText,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import AuthenticatedImage from '@/modules/planika/maloprodaja/components/AuthenticatedImage';
import { contractCompaniesService } from '@/services/contractCompaniesService';
import { useAuthStore } from '@/store/authStore';
import type { ContractCompany, ContractCompanyFormData } from '@/types/contract-companies';

const emptyForm: ContractCompanyFormData = { name: '', code: '', city: '', notes: '' };

function isAdminUser(user: ReturnType<typeof useAuthStore.getState>['user']): boolean {
  if (!user) return false;
  const role = user.role?.toLowerCase();
  if (role === 'admin' || role === 'super-admin') return true;
  const roles = (user as { roles?: string[] }).roles;
  return (
    roles?.some((r) => {
      const lower = r?.toLowerCase();
      return lower === 'admin' || lower === 'super-admin' || lower === 'super admin';
    }) ?? false
  );
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContractCompaniesPage() {
  const { user } = useAuthStore();
  const canManage = isAdminUser(user);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<ContractCompany[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'pregled' | 'administracija'>('pregled');
  const [showForm, setShowForm] = useState(false);
  const [showExcel, setShowExcel] = useState(false);
  const [editing, setEditing] = useState<ContractCompany | null>(null);
  const [form, setForm] = useState<ContractCompanyFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelProgress, setExcelProgress] = useState(0);
  const [selected, setSelected] = useState<ContractCompany | null>(null);
  const [previewListId, setPreviewListId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [listTitle, setListTitle] = useState('');
  const [listFile, setListFile] = useState<File | null>(null);
  const [uploadingList, setUploadingList] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await contractCompaniesService.list({
        search: search.trim() || undefined,
        city: cityFilter || undefined,
      });
      setCompanies(res.data);
      setCities(res.cities ?? []);
    } catch {
      toast.error('Greška pri učitavanju firmi');
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const activeList = selected?.employee_lists?.find((item) => item.id === previewListId);

    if (!selected || !activeList || activeList.file_type !== 'pdf') {
      setPreviewLoading(false);
      setPreviewUrl(null);
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }

    const loadPdfPreview = async () => {
      try {
        setPreviewLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(contractCompaniesService.employeeListUrl(selected.id, activeList.id), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error('Failed to load PDF preview');
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setPreviewUrl(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setPreviewUrl(null);
          toast.error('Greška pri učitavanju PDF pregleda');
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadPdfPreview();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewListId, selected]);

  const filteredCount = useMemo(() => companies.length, [companies]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (company: ContractCompany) => {
    setEditing(company);
    setForm({
      name: company.name,
      code: company.code,
      city: company.city ?? '',
      notes: company.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Naziv i šifra firme su obavezni');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await contractCompaniesService.update(editing.id, form);
        toast.success('Firma je ažurirana');
      } else {
        await contractCompaniesService.create(form);
        toast.success('Firma je dodana');
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await loadData();
    } catch {
      // toast handled by api interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company: ContractCompany) => {
    if (!window.confirm(`Obrisati firmu "${company.name}"?`)) return;
    try {
      await contractCompaniesService.remove(company.id);
      toast.success('Firma je obrisana');
      if (selected?.id === company.id) setSelected(null);
      await loadData();
    } catch {
      // handled
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      toast.error('Odaberite Excel fajl');
      return;
    }
    setUploadingExcel(true);
    setExcelProgress(0);
    try {
      const res = await contractCompaniesService.uploadExcel(excelFile, setExcelProgress);
      toast.success(
        `Uvezeno: ${res.success_count}, ažurirano: ${res.updated_count}, grešaka: ${res.error_count}`
      );
      if (res.error_count === 0) {
        setExcelFile(null);
        setShowExcel(false);
      }
      await loadData();
    } catch {
      // handled
    } finally {
      setUploadingExcel(false);
    }
  };

  const openDetail = async (company: ContractCompany) => {
    try {
      const full = await contractCompaniesService.get(company.id);
      setSelected(full);
      setPreviewListId(full.employee_lists?.[0]?.id ?? null);
      setPreviewUrl(null);
      setPreviewZoom(1);
      setListTitle('');
      setListFile(null);
    } catch {
      toast.error('Greška pri učitavanju detalja firme');
    }
  };

  const handleListUpload = async () => {
    if (!selected || !listFile) {
      toast.error('Odaberite sliku ili PDF dokument');
      return;
    }
    setUploadingList(true);
    try {
      const res = await contractCompaniesService.uploadEmployeeList(
        selected.id,
        listFile,
        listTitle.trim() || undefined
      );
      setSelected(res.company);
      setListFile(null);
      setListTitle('');
      toast.success('Spisak uposlenika je učitan');
      await loadData();
    } catch {
      // handled
    } finally {
      setUploadingList(false);
    }
  };

  const handleListDelete = async (listId: number) => {
    if (!selected || !window.confirm('Obrisati ovaj spisak uposlenika?')) return;
    try {
      await contractCompaniesService.deleteEmployeeList(selected.id, listId);
      const full = await contractCompaniesService.get(selected.id);
      setSelected(full);
      toast.success('Spisak je obrisan');
      await loadData();
    } catch {
      // handled
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('pregled')}
          className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'pregled'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'border border-gray-200 bg-white text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300'
          }`}
        >
          Pregled firmi i spiskova
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('administracija')}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'administracija'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300'
            }`}
          >
            Administracija
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData();
          }}
          className="flex flex-1 flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraga po nazivu, šifri, gradu, napomeni..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-dark-600 dark:bg-dark-900"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
          >
            <option value="">Svi gradovi</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
          >
            Pretraži
          </button>
        </form>

        {canManage && activeTab === 'administracija' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowExcel((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium dark:border-dark-600 dark:bg-dark-800"
            >
              <FiUpload size={16} />
              Uvoz Excel
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <FiPlus size={16} />
              Nova firma
            </button>
          </div>
        )}
      </div>

      {!canManage && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-800 dark:border-sky-900/40 dark:bg-sky-900/10 dark:text-sky-200">
          Dostupan vam je pregled firmi i spiskova. Unos i izmjene su dostupni samo u administratorskom tabu.
        </div>
      )}

      {canManage && activeTab === 'administracija' && showExcel && (
        <div className="card space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Uvoz firmi iz Excel-a</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Kolone: <strong>Naziv</strong>, <strong>Šifra</strong>, <strong>Grad</strong>. Ako firma sa istom
                šifrom već postoji, podaci se ažuriraju.
              </p>
            </div>
            <button type="button" onClick={() => setShowExcel(false)} className="text-gray-400 hover:text-gray-600">
              <FiX size={18} />
            </button>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {uploadingExcel && (
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${excelProgress}%` }} />
            </div>
          )}
          <button
            type="button"
            disabled={!excelFile || uploadingExcel}
            onClick={handleExcelUpload}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploadingExcel ? 'Učitavanje...' : 'Uvezi firme'}
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-dark-700 dark:text-gray-400">
          Prikazano firmi: <strong>{filteredCount}</strong>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          </div>
        ) : companies.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {canManage && activeTab === 'administracija'
              ? 'Nema firmi za prikaz. Dodajte ručno ili uvezite iz Excel-a.'
              : 'Nema firmi za prikaz.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-dark-900/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Naziv firme</th>
                  <th className="px-4 py-3">Šifra</th>
                  <th className="px-4 py-3">Grad</th>
                  <th className="px-4 py-3">Spiskovi</th>
                  <th className="px-4 py-3">Napomena</th>
                  <th className="px-4 py-3 text-right">{canManage && activeTab === 'administracija' ? 'Akcije' : 'Pregled'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50/70 dark:hover:bg-dark-900/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{company.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{company.code}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{company.city || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        <FiFileText size={12} />
                        {company.employee_lists_count ?? company.employee_lists?.length ?? 0}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-500 dark:text-gray-400">
                      {company.notes || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openDetail(company)}
                          className="rounded-lg px-2 py-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20"
                          title="Pregled spiskova"
                        >
                          <FiFile size={16} />
                        </button>
                        {canManage && activeTab === 'administracija' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(company)}
                              className="rounded-lg px-2 py-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700"
                              title="Uredi"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(company)}
                              className="rounded-lg px-2 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Obriši"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Uredi firmu' : 'Nova firma'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Naziv firme *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Šifra firme *</label>
                <input
                  className="input font-mono"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Grad</label>
                <input
                  className="input"
                  value={form.city ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Napomena</label>
                <textarea
                  className="input min-h-[80px]"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Odustani
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Spremanje...' : editing ? 'Sačuvaj' : 'Dodaj firmu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-dark-800">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selected.name}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Šifra: <span className="font-mono">{selected.code}</span>
                  {selected.city ? ` · ${selected.city}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden px-6 py-5 lg:grid-cols-[320px,minmax(0,1fr)]">
              <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
                {selected.notes && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-dark-900/40 dark:text-gray-300">
                    {selected.notes}
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Spiskovi uposlenika</h4>
                  {(selected.employee_lists ?? []).length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Još nema učitanih spiskova.</p>
                  ) : (
                    <div className="space-y-3">
                      {(selected.employee_lists ?? []).map((list) => {
                        const isActive = previewListId === list.id;
                        return (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => {
                              setPreviewListId(list.id);
                              setPreviewUrl(null);
                              setPreviewZoom(1);
                            }}
                            className={`block w-full rounded-xl border p-3 text-left transition ${
                              isActive
                                ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-900/20'
                                : 'border-gray-200 hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-900/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                  {list.title || list.file_name}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {list.file_type === 'pdf' ? 'PDF dokument' : 'Slika'} · {formatBytes(list.file_size)}
                                </p>
                              </div>
                              <FiFileText className="shrink-0 text-sky-500" size={16} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {canManage && activeTab === 'administracija' && (
                  <div className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-dark-600">
                    <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                      Učitaj novi spisak (slika ili PDF)
                    </h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Naslov (opcionalno)"
                        value={listTitle}
                        onChange={(e) => setListTitle(e.target.value)}
                        className="input"
                      />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setListFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm"
                      />
                      <button
                        type="button"
                        disabled={!listFile || uploadingList}
                        onClick={handleListUpload}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        <FiUpload size={16} />
                        {uploadingList ? 'Učitavanje...' : 'Učitaj spisak'}
                      </button>
                  </div>
                </div>
                )}
              </div>

              <div className="min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-dark-700 dark:bg-dark-900/40">
                {(() => {
                  const activeList = selected.employee_lists?.find((item) => item.id === previewListId) ?? null;

                  if (!activeList) {
                    return (
                      <div className="flex h-full items-center justify-center p-8 text-sm text-gray-500 dark:text-gray-400">
                        Odaberite spisak za pregled.
                      </div>
                    );
                  }

                  if (activeList.file_type === 'image') {
                    return (
                      <div className="flex h-full flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-700">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {activeList.title || activeList.file_name}
                            </p>
                            <p className="text-xs text-gray-500">{formatBytes(activeList.file_size)}</p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setPreviewZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))}
                              className="text-xs font-medium text-sky-600 hover:underline"
                            >
                              Zoom -
                            </button>
                            <span className="text-xs text-gray-500">{Math.round(previewZoom * 100)}%</span>
                            <button
                              type="button"
                              onClick={() => setPreviewZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}
                              className="text-xs font-medium text-sky-600 hover:underline"
                            >
                              Zoom +
                            </button>
                            {canManage && activeTab === 'administracija' && (
                              <button
                                type="button"
                                onClick={() => handleListDelete(activeList.id)}
                                className="text-xs font-medium text-red-600 hover:underline"
                              >
                                Obriši
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto bg-black/5 p-4 dark:bg-black/20">
                          <div
                            className="mx-auto h-full origin-top overflow-visible transition-transform"
                            style={{ transform: `scale(${previewZoom})`, width: `${100 / previewZoom}%` }}
                          >
                            <AuthenticatedImage
                              src={activeList.download_url}
                              alt={activeList.title || activeList.file_name}
                              className="h-auto min-h-full w-full rounded-xl object-contain"
                              fallbackClassName="flex h-full min-h-[320px] items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400 dark:bg-dark-900/40"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex h-full flex-col overflow-hidden">
                      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-700">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activeList.title || activeList.file_name}
                          </p>
                          <p className="text-xs text-gray-500">{formatBytes(activeList.file_size)}</p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setPreviewZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))}
                            className="text-xs font-medium text-sky-600 hover:underline"
                          >
                            Zoom -
                          </button>
                          <span className="text-xs text-gray-500">{Math.round(previewZoom * 100)}%</span>
                          <button
                            type="button"
                            onClick={() => setPreviewZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}
                            className="text-xs font-medium text-sky-600 hover:underline"
                          >
                            Zoom +
                          </button>
                          {canManage && activeTab === 'administracija' && (
                            <button
                              type="button"
                              onClick={() => handleListDelete(activeList.id)}
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Obriši
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto bg-white dark:bg-dark-900">
                        {previewLoading ? (
                          <div className="flex h-full items-center justify-center">
                            <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                          </div>
                        ) : previewUrl ? (
                          <iframe
                            src={`${previewUrl}#zoom=${Math.round(previewZoom * 100)}`}
                            title={activeList.title || activeList.file_name}
                            className="h-full min-h-[70vh] w-full"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center p-8 text-sm text-gray-500 dark:text-gray-400">
                            PDF pregled nije dostupan.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
