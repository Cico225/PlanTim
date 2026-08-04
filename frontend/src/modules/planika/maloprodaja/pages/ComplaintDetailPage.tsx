import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCheckCircle, FiFileText, FiPrinter, FiSend, FiXCircle } from 'react-icons/fi';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ComplaintPhotoSlot from '../components/ComplaintPhotoSlot';
import ComplaintPrintSheet from '../components/ComplaintPrintSheet';
import ComplaintRejectionLetter, {
  buildDefaultRejectionResponse,
} from '../components/ComplaintRejectionLetter';
import { retailComplaintsService } from '@/services/retailComplaintsService';
import {
  ComplaintCapabilities,
  ComplaintReviewAction,
  PAYMENT_METHODS,
  RetailComplaint,
  canEditComplaintPhotos,
  isComplaintSubmitted,
} from '@/types/retail-complaints';
import { ComplaintStatusBadge, getComplaintPhaseLabel } from '../components/ComplaintStatusUI';

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState<RetailComplaint | null>(null);
  const [capabilities, setCapabilities] = useState<ComplaintCapabilities | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (id) loadData(parseInt(id, 10));
  }, [id]);

  const loadData = async (complaintId: number) => {
    try {
      setLoading(true);
      const [caps, data] = await Promise.all([
        retailComplaintsService.getCapabilities(),
        retailComplaintsService.get(complaintId),
      ]);
      setCapabilities(caps);
      setComplaint(data);
      setAdminResponse(data.admin_response || buildDefaultRejectionResponse(data));
    } catch {
      toast.error('Greška pri učitavanju reklamacije');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: ComplaintReviewAction) => {
    if (!complaint) return;

    if (!adminResponse.trim()) {
      toast.error(action === 'odbijena' ? 'Unesite tekst odgovora u dopisu kupcu' : 'Unesite dopis kupcu');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await retailComplaintsService.review(complaint.id, {
        action,
        admin_response: adminResponse,
      });
      setComplaint(updated);
      toast.success(
        action === 'odobrena'
          ? 'Reklamacija je odobrena'
          : 'Reklamacija je odbijena. Možete odštampati dopis kupcu.'
      );
    } catch {
      toast.error('Greška pri obradi reklamacije');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoSelect = async (slot: number, file: File) => {
    if (!complaint) return;
    const updated = await retailComplaintsService.uploadPhoto(complaint.id, slot, file);
    setComplaint(updated);
    toast.success(`Fotografija ${slot} ažurirana`);
  };

  const handleSendToDirection = async () => {
    if (!complaint) return;
    const hasPhoto = [1, 2, 3, 4].some((slot) => complaint[`photo_${slot}_path` as keyof RetailComplaint]);
    if (!hasPhoto) {
      toast.error('Dodajte barem jednu fotografiju prije slanja');
      return;
    }

    try {
      setSending(true);
      const updated = await retailComplaintsService.update(complaint.id, {
        customer_name: complaint.customer_name,
        customer_address: complaint.customer_address || undefined,
        customer_phone: complaint.customer_phone || undefined,
        customer_city: complaint.customer_city || undefined,
        customer_email: complaint.customer_email || undefined,
        article_code: complaint.article_code || undefined,
        article_price: complaint.article_price ?? undefined,
        payment_method: complaint.payment_method || undefined,
        receipt_number: complaint.receipt_number || undefined,
        purchase_date: complaint.purchase_date || undefined,
        defect_description: complaint.defect_description || undefined,
        finalize: true,
      });
      setComplaint(updated);
      toast.success('Reklamacija je poslana u direkciju');
    } catch {
      toast.error('Greška pri slanju u direkciju');
    } finally {
      setSending(false);
    }
  };

  const handlePrintForm = () => {
    document.body.classList.remove('printing-complaint-letter');
    document.body.classList.add('printing-complaint-form');
    const cleanup = () => {
      document.body.classList.remove('printing-complaint-form', 'printing-complaint-letter');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.setTimeout(() => window.print(), 50);
  };

  const handlePrintLetter = () => {
    document.body.classList.remove('printing-complaint-form');
    document.body.classList.add('printing-complaint-letter');
    const cleanup = () => {
      document.body.classList.remove('printing-complaint-form', 'printing-complaint-letter');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.setTimeout(() => window.print(), 50);
  };

  const canManagePhotos =
    !!complaint &&
    !!capabilities?.can_create &&
    canEditComplaintPhotos(complaint);

  const paymentLabel =
    PAYMENT_METHODS.find((item) => item.value === complaint?.payment_method)?.label ||
    complaint?.payment_method ||
    '—';
  const activeTab = searchParams.get('tab') === 'obrada' ? 'obrada' : 'unos';
  const submitted = complaint ? isComplaintSubmitted(complaint) : false;
  const canReviewNow =
    !!capabilities?.can_review &&
    complaint?.status === 'zaprimljena' &&
    submitted;
  const isRejected = complaint?.status === 'odbijena';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500">Reklamacija nije pronađena.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/planika/retail/reklamacije?tab=${activeTab}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <FiArrowLeft size={16} />
          Nazad
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrintForm}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-200"
          >
            <FiPrinter size={16} />
            Štampaj zahtjev
          </button>
          {(isRejected || canReviewNow) && (
            <button
              type="button"
              onClick={handlePrintLetter}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <FiFileText size={16} />
              Štampaj dopis
            </button>
          )}
        </div>
      </div>

      <div className="complaint-print-root hidden">
        <ComplaintPrintSheet complaint={complaint} />
      </div>

      <div className="complaint-letter-print-root hidden">
        <ComplaintRejectionLetter complaint={complaint} responseText={adminResponse} />
      </div>

      <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{complaint.complaint_number}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{complaint.customer_name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {complaint.store_name} · {getComplaintPhaseLabel(complaint)}
          </p>
        </div>
        <ComplaintStatusBadge status={complaint.status} />
      </div>

      <div className="print:hidden card space-y-6 p-5 sm:p-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Prodavnica
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <InfoSection title="Kupac">
              <InfoRow label="Ime i prezime" value={complaint.customer_name} />
              <InfoRow label="Adresa" value={complaint.customer_address} />
              <InfoRow label="Telefon" value={complaint.customer_phone} />
              <InfoRow label="Mjesto" value={complaint.customer_city} />
              <InfoRow label="Email" value={complaint.customer_email} />
            </InfoSection>
            <InfoSection title="Artikal">
              <InfoRow label="Šifra" value={complaint.article_code} />
              <InfoRow
                label="Cijena"
                value={complaint.article_price != null ? `${complaint.article_price} KM` : null}
              />
              <InfoRow label="Plaćanje" value={paymentLabel} />
              <InfoRow label="Račun" value={complaint.receipt_number} />
              <InfoRow
                label="Datum kupovine"
                value={complaint.purchase_date ? new Date(complaint.purchase_date).toLocaleDateString('bs-BA') : null}
              />
            </InfoSection>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Opis greške</h3>
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700 dark:bg-dark-900/40 dark:text-gray-300">
              {complaint.defect_description || 'Nije uneseno'}
            </p>
          </div>

          <div className="mt-5">
            <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Fotografije</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((slot) => {
                const url = complaint[`photo_${slot}_url` as keyof RetailComplaint] as string | null | undefined;
                const hasPhoto = Boolean(complaint[`photo_${slot}_path` as keyof RetailComplaint]);
                if (canManagePhotos) {
                  return (
                    <ComplaintPhotoSlot
                      key={slot}
                      slot={slot}
                      label={`Fotografija ${slot}${slot === 1 ? ' *' : ''}`}
                      previewUrl={url}
                      uploaded={hasPhoto}
                      onSelect={handlePhotoSelect}
                    />
                  );
                }

                return (
                  <div key={slot} className="overflow-hidden rounded-xl border border-gray-200 dark:border-dark-700">
                    <AuthenticatedImage src={url} alt={`Fotografija ${slot}`} />
                  </div>
                );
              })}
            </div>

            {canManagePhotos && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20 dark:bg-amber-900/10">
                <p className="text-sm text-amber-900 dark:text-amber-100">Dodajte foto, zatim pošaljite u direkciju.</p>
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleSendToDirection}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  <FiSend size={16} />
                  {sending ? 'Slanje...' : 'Pošalji u direkciju'}
                </button>
              </div>
            )}
          </div>
        </div>

        {(canReviewNow || isRejected || complaint.status === 'odobrena') && (
          <div className="border-t border-gray-100 pt-6 dark:border-dark-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Direkcija
            </p>

            {complaint.admin_response && complaint.status === 'odobrena' && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-900/20">
                <p className="text-sm whitespace-pre-wrap text-emerald-950 dark:text-emerald-100">
                  {complaint.admin_response}
                </p>
              </div>
            )}

            {canReviewNow && (
              <div className="mb-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Odgovor (ODGOVOR) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReview('odbijena')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
                  >
                    <FiXCircle size={16} />
                    Odbij
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReview('odobrena')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <FiCheckCircle size={16} />
                    Odobri
                  </button>
                </div>
              </div>
            )}

            {(canReviewNow || isRejected) && (
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Dopis kupcu</h3>
                  {isRejected && (
                    <button
                      type="button"
                      onClick={handlePrintLetter}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      <FiPrinter size={14} />
                      Štampaj
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900/40">
                  <ComplaintRejectionLetter
                    complaint={complaint}
                    responseText={isRejected ? complaint.admin_response || adminResponse : adminResponse}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h3>
      <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-dark-700 dark:bg-dark-900/30">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-800 dark:text-gray-200">{value || '—'}</span>
    </div>
  );
}
