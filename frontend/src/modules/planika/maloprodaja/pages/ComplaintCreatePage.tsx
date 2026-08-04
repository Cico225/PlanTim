import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCamera, FiCheckCircle, FiPrinter, FiSave } from 'react-icons/fi';
import ComplaintPhotoSlot from '../components/ComplaintPhotoSlot';
import ComplaintPrintSheet from '../components/ComplaintPrintSheet';
import { retailComplaintsService } from '@/services/retailComplaintsService';
import { ComplaintCapabilities, CreateComplaintPayload, PAYMENT_METHODS, RetailComplaint } from '@/types/retail-complaints';

const emptyForm = {
  customer_name: '',
  customer_address: '',
  customer_phone: '',
  customer_city: '',
  customer_email: '',
  article_code: '',
  article_price: '',
  payment_method: '',
  receipt_number: '',
  purchase_date: '',
  defect_description: '',
};

function hasAtLeastOnePhoto(uploadedSlots: Record<number, boolean>) {
  return Object.values(uploadedSlots).some(Boolean);
}

function validateForm(form: typeof emptyForm, capabilities: ComplaintCapabilities | null, selectedStoreId: string): string | null {
  if (capabilities?.requires_store_selection && !selectedStoreId) {
    return 'Odaberite prodavnicu';
  }
  if (!form.customer_name.trim()) return 'Ime i prezime kupca je obavezno';
  if (!form.customer_phone.trim()) return 'Telefon kupca je obavezan';
  if (!form.customer_address.trim()) return 'Adresa kupca je obavezna';
  if (!form.customer_city.trim()) return 'Mjesto stanovanja je obavezno';
  if (!form.article_code.trim()) return 'Šifra artikla je obavezna';
  if (!form.article_price.trim() || Number(form.article_price) < 0) return 'Cijena artikla je obavezna';
  if (!form.payment_method) return 'Način plaćanja je obavezan';
  if (!form.purchase_date) return 'Datum kupovine je obavezan';
  if (!form.defect_description.trim()) return 'Opis greške je obavezan';
  if (form.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)) {
    return 'Email kupca nije ispravan';
  }
  return null;
}

function toPayload(form: typeof emptyForm, selectedStoreId: string): CreateComplaintPayload {
  return {
    customer_name: form.customer_name.trim(),
    customer_address: form.customer_address.trim(),
    customer_phone: form.customer_phone.trim(),
    customer_city: form.customer_city.trim(),
    customer_email: form.customer_email.trim() || undefined,
    article_code: form.article_code.trim(),
    article_price: Number(form.article_price),
    payment_method: form.payment_method,
    receipt_number: form.receipt_number.trim() || undefined,
    purchase_date: form.purchase_date,
    defect_description: form.defect_description.trim(),
    store_id: selectedStoreId ? Number(selectedStoreId) : undefined,
  };
}

export default function ComplaintCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(emptyForm);
  const [capabilities, setCapabilities] = useState<ComplaintCapabilities | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [savedComplaint, setSavedComplaint] = useState<RetailComplaint | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [complaintId, setComplaintId] = useState<number | null>(null);
  const [uploadedSlots, setUploadedSlots] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [photoUrls, setPhotoUrls] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
  });

  const entryDateLabel = useMemo(
    () => new Date().toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  );
  const activeTab = searchParams.get('tab') === 'obrada' ? 'obrada' : 'unos';
  const selectedStoreName =
    capabilities?.stores?.find((store) => String(store.id) === selectedStoreId)?.name ||
    savedComplaint?.store_name ||
    'Dodijeljena prodavnica';
  const previewComplaint: RetailComplaint | null = savedComplaint
    ? savedComplaint
    : complaintId
      ? ({
          id: complaintId,
          complaint_number: 'Novi zahtjev',
          store_id: selectedStoreId ? Number(selectedStoreId) : 0,
          store_name: selectedStoreName,
          created_by: 0,
          customer_name: form.customer_name,
          customer_address: form.customer_address,
          customer_phone: form.customer_phone,
          customer_city: form.customer_city,
          customer_email: form.customer_email,
          article_code: form.article_code,
          article_price: form.article_price ? Number(form.article_price) : null,
          payment_method: form.payment_method,
          receipt_number: form.receipt_number,
          purchase_date: form.purchase_date,
          defect_description: form.defect_description,
          status: 'zaprimljena',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as RetailComplaint)
      : null;

  useEffect(() => {
    retailComplaintsService.getCapabilities().then((caps) => {
      if (!caps.can_create) {
        toast.error('Nemate dozvolu za unos reklamacija');
        navigate('/planika/retail/reklamacije?tab=obrada');
        return;
      }
      setCapabilities(caps);
      if (caps.store_id) {
        setSelectedStoreId(String(caps.store_id));
      }
    });
  }, [navigate]);

  const updateField = (field: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const ensureComplaint = async (): Promise<number> => {
    const validationError = validateForm(form, capabilities, selectedStoreId);
    if (validationError) {
      toast.error(validationError);
      throw new Error(validationError);
    }

    const payload = toPayload(form, selectedStoreId);

    if (complaintId) {
      const updated = await retailComplaintsService.update(complaintId, payload);
      setSavedComplaint(updated);
      return complaintId;
    }

    const created = await retailComplaintsService.create(payload);
    setComplaintId(created.id);
    setSavedComplaint(created);
    return created.id;
  };

  const syncPhotosFromComplaint = (updated: {
    photo_1_path?: string | null;
    photo_2_path?: string | null;
    photo_3_path?: string | null;
    photo_4_path?: string | null;
    photo_1_url?: string | null;
    photo_2_url?: string | null;
    photo_3_url?: string | null;
    photo_4_url?: string | null;
  }) => {
    setUploadedSlots({
      1: !!updated.photo_1_path,
      2: !!updated.photo_2_path,
      3: !!updated.photo_3_path,
      4: !!updated.photo_4_path,
    });
    setPhotoUrls({
      1: updated.photo_1_url || null,
      2: updated.photo_2_url || null,
      3: updated.photo_3_url || null,
      4: updated.photo_4_url || null,
    });
  };

  const handlePhotoSelect = async (slot: number, file: File) => {
    try {
      const id = await ensureComplaint();
      const updated = await retailComplaintsService.uploadPhoto(id, slot, file);
      syncPhotosFromComplaint(updated);
      setSavedComplaint(updated);
      toast.success(`Fotografija ${slot} učitana`);
    } catch (error) {
      const apiError =
        (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;

      if (apiError && !(error instanceof Error && error.message === apiError)) {
        toast.error(apiError);
      } else if (!(error instanceof Error && validateForm(form, capabilities, selectedStoreId) === error.message)) {
        toast.error('Greška pri uploadu fotografije');
      }
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm(form, capabilities, selectedStoreId);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (!complaintId) {
      toast.error('Prvo spremite osnovne podatke reklamacije');
      return;
    }

    if (!hasAtLeastOnePhoto(uploadedSlots)) {
      toast.error('Potrebna je barem jedna fotografija artikla');
      return;
    }

    try {
      setSaving(true);
      const payload = { ...toPayload(form, selectedStoreId), finalize: true };
      const result = await retailComplaintsService.update(complaintId, payload);
      setSavedComplaint(result);

      toast.success('Reklamacija je poslana u direkciju');
      navigate(`/planika/retail/reklamacije/${result.id}?tab=${activeTab}`);
    } catch {
      toast.error('Greška pri slanju reklamacije');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPreparePrint = async () => {
    const validationError = validateForm(form, capabilities, selectedStoreId);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSavingDraft(true);
      const id = await ensureComplaint();
      const fresh = await retailComplaintsService.get(id);
      setSavedComplaint(fresh);
      toast.success('Reklamacija je zaprimljena. Možete štampati zahtjev.');
    } catch {
      toast.error('Greška pri spremanju osnovnih podataka');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePrint = () => {
    if (!previewComplaint) {
      toast.error('Prvo spremite osnovne podatke reklamacije');
      return;
    }

    document.body.classList.remove('printing-complaint-letter');
    document.body.classList.add('printing-complaint-form');
    const cleanup = () => {
      document.body.classList.remove('printing-complaint-form', 'printing-complaint-letter');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const canShowPhotoStep = Boolean(complaintId);
  const canFinalize = Boolean(complaintId) && hasAtLeastOnePhoto(uploadedSlots);

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Link
          to={`/planika/retail/reklamacije?tab=${activeTab}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <FiArrowLeft size={16} />
          Nazad
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Prodavnica
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Nova reklamacija</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Unos → print → fotografije → pošalji u direkciju
            </p>
          </div>
          {savedComplaint && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
              {savedComplaint.complaint_number} · Zaprimljena
            </span>
          )}
        </div>
      </div>

      {previewComplaint && (
        <div className="complaint-print-root hidden print:block">
          <ComplaintPrintSheet complaint={previewComplaint} />
        </div>
      )}

      <div className="print:hidden card space-y-6 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {capabilities?.requires_store_selection && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Prodavnica</h2>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
              >
                <option value="">Odaberite prodavnicu</option>
                {capabilities.stores?.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Podaci o kupcu</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ime i prezime kupca" required value={form.customer_name} onChange={(v) => updateField('customer_name', v)} />
              <Field label="Telefon kupca" required value={form.customer_phone} onChange={(v) => updateField('customer_phone', v)} type="tel" />
              <Field label="Adresa kupca" required value={form.customer_address} onChange={(v) => updateField('customer_address', v)} />
              <Field label="Mjesto stanovanja" required value={form.customer_city} onChange={(v) => updateField('customer_city', v)} />
              <Field label="Email kupca" value={form.customer_email} onChange={(v) => updateField('customer_email', v)} type="email" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Datum unosa
                </label>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-600 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300">
                  {entryDateLabel}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Podaci o artiklu</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Šifra artikla" required value={form.article_code} onChange={(v) => updateField('article_code', v)} />
              <Field label="Cijena artikla" required value={form.article_price} onChange={(v) => updateField('article_price', v)} type="number" step="0.01" min="0" />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Način plaćanja <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.payment_method}
                  onChange={(e) => updateField('payment_method', e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
                >
                  <option value="">Odaberite</option>
                  {PAYMENT_METHODS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Broj računa" value={form.receipt_number} onChange={(v) => updateField('receipt_number', v)} />
              <Field label="Datum kupovine" required value={form.purchase_date} onChange={(v) => updateField('purchase_date', v)} type="date" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Opis greške <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.defect_description}
                onChange={(e) => updateField('defect_description', e.target.value)}
                required
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
              />
            </div>
          </section>

          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-dark-600 dark:bg-dark-900/40">
            <p className="text-sm text-gray-600 dark:text-gray-300">Spremi podatke, zatim odštampaj zahtjev.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleSaveAndPreparePrint}
                disabled={savingDraft}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-dark-500 dark:bg-dark-800 dark:text-gray-200"
              >
                <FiSave size={16} />
                {savingDraft ? 'Spremanje...' : 'Spremi'}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!previewComplaint}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                <FiPrinter size={16} />
                Štampaj zahtjev
              </button>
            </div>
          </div>

          {previewComplaint && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900/40">
              <ComplaintPrintSheet complaint={previewComplaint} />
            </div>
          )}

          <section className="space-y-3 border-t border-gray-100 pt-5 dark:border-dark-700">
            <div className="flex items-center gap-2">
              <FiCamera className="text-gray-400" size={16} />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Fotografije</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nakon potpisa kupca dodajte fotografije i pošaljite u direkciju.
            </p>

            {!canShowPhotoStep ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500 dark:border-dark-700">
                Prvo spremite podatke.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((slot) => (
                    <ComplaintPhotoSlot
                      key={slot}
                      slot={slot}
                      label={`Fotografija ${slot}${slot === 1 ? ' *' : ''}`}
                      previewUrl={photoUrls[slot]}
                      uploaded={uploadedSlots[slot]}
                      onSelect={handlePhotoSelect}
                    />
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !canFinalize}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <FiCheckCircle size={16} />
                    {saving ? 'Slanje...' : 'Pošalji u direkciju'}
                  </button>
                </div>
              </>
            )}
          </section>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  step,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        step={step}
        min={min}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
      />
    </div>
  );
}
