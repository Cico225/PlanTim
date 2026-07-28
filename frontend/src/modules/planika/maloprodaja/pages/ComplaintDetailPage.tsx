import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCheckCircle, FiMessageSquare, FiXCircle } from 'react-icons/fi';
import AuthenticatedImage from '../components/AuthenticatedImage';
import ComplaintPhotoSlot from '../components/ComplaintPhotoSlot';
import { retailComplaintsService } from '@/services/retailComplaintsService';
import {
  COMPLAINT_STATUS_LABELS,
  ComplaintCapabilities,
  ComplaintReviewAction,
  PAYMENT_METHODS,
  RetailComplaint,
} from '@/types/retail-complaints';

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [complaint, setComplaint] = useState<RetailComplaint | null>(null);
  const [capabilities, setCapabilities] = useState<ComplaintCapabilities | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setAdminComment(data.admin_comment || '');
      setAdminResponse(data.admin_response || '');
    } catch {
      toast.error('Greška pri učitavanju reklamacije');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: ComplaintReviewAction) => {
    if (!complaint) return;

    if (action === 'ponovo_uslikati' && !adminComment.trim()) {
      toast.error('Unesite komentar za ponovno slikanje');
      return;
    }

    if ((action === 'odbijena' || action === 'opravdana') && !adminResponse.trim()) {
      toast.error('Unesite dopis kupcu');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await retailComplaintsService.review(complaint.id, {
        action,
        admin_comment: action === 'ponovo_uslikati' ? adminComment : undefined,
        admin_response: action === 'odbijena' || action === 'opravdana' ? adminResponse : undefined,
      });
      setComplaint(updated);
      toast.success('Status reklamacije je ažuriran');
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

  const canReuploadPhotos =
    !capabilities?.can_review &&
    capabilities?.can_create &&
    complaint?.status === 'ponovo_uslikati';

  const paymentLabel =
    PAYMENT_METHODS.find((item) => item.value === complaint?.payment_method)?.label ||
    complaint?.payment_method ||
    '—';

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
    <div className="space-y-6">
      <Link
        to="/planika/retail/reklamacije"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
      >
        <FiArrowLeft size={16} />
        Nazad na listu
      </Link>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-dark-700 dark:bg-dark-800 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{complaint.complaint_number}</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{complaint.customer_name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {complaint.store_name} · {new Date(complaint.created_at).toLocaleString('bs-BA')}
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {COMPLAINT_STATUS_LABELS[complaint.status]}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <InfoSection title="Podaci o kupcu">
            <InfoRow label="Ime i prezime" value={complaint.customer_name} />
            <InfoRow label="Adresa" value={complaint.customer_address} />
            <InfoRow label="Telefon" value={complaint.customer_phone} />
            <InfoRow label="Mjesto stanovanja" value={complaint.customer_city} />
            <InfoRow label="Email" value={complaint.customer_email} />
          </InfoSection>

          <InfoSection title="Podaci o artiklu">
            <InfoRow label="Šifra artikla" value={complaint.article_code} />
            <InfoRow label="Cijena artikla" value={complaint.article_price != null ? `${complaint.article_price} KM` : null} />
            <InfoRow label="Način plaćanja" value={paymentLabel} />
            <InfoRow label="Broj računa" value={complaint.receipt_number} />
            <InfoRow
              label="Datum kupovine"
              value={complaint.purchase_date ? new Date(complaint.purchase_date).toLocaleDateString('bs-BA') : null}
            />
          </InfoSection>
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Opis greške</h3>
          <p className="rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700 dark:bg-dark-900/40 dark:text-gray-300">
            {complaint.defect_description || 'Nije uneseno'}
          </p>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Fotografije artikla</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((slot) => {
              const url = complaint[`photo_${slot}_url` as keyof RetailComplaint] as string | null | undefined;
              if (canReuploadPhotos) {
                return (
                  <ComplaintPhotoSlot
                    key={slot}
                    slot={slot}
                    label={`Fotografija ${slot}`}
                    previewUrl={url}
                    onSelect={handlePhotoSelect}
                  />
                );
              }

              return (
                <div key={slot} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-700">
                  <AuthenticatedImage src={url} alt={`Fotografija ${slot}`} />
                </div>
              );
            })}
          </div>
        </div>

        {(complaint.admin_comment || complaint.admin_response) && (
          <div className="mt-6 space-y-4">
            {complaint.admin_comment && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-900/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Komentar direkcije
                </p>
                <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">{complaint.admin_comment}</p>
              </div>
            )}
            {complaint.admin_response && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-600 dark:bg-dark-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Odgovor direkcije kupcu</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {complaint.admin_response}
                </p>
                {complaint.reviewed_by_name && (
                  <p className="mt-3 text-xs text-gray-500">
                    {complaint.reviewed_by_name} ·{' '}
                    {complaint.reviewed_at ? new Date(complaint.reviewed_at).toLocaleString('bs-BA') : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {capabilities?.can_review && !['odbijena', 'opravdana'].includes(complaint.status) && (
        <div className="card space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Obrada reklamacije (direkcija)</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Komentar za ponovno slikanje
            </label>
            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows={3}
              placeholder="Npr. potrebno je jasnije uslikati đon i mjesto oštećenja..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleReview('ponovo_uslikati')}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
            >
              <FiMessageSquare size={16} />
              Zatraži ponovno slikanje
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dopis kupcu (odbijanje / opravdanje)
            </label>
            <textarea
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              rows={4}
              placeholder="Tekst odgovora koji prodavnica može proslijediti kupcu..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleReview('odbijena')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
              >
                <FiXCircle size={16} />
                Odbij reklamaciju
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleReview('opravdana')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                <FiCheckCircle size={16} />
                Opravdaj reklamaciju
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-dark-700 dark:bg-dark-900/30">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{value || '—'}</span>
    </div>
  );
}
