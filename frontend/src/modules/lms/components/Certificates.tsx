import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiAward,
  FiDownload,
  FiEye,
  FiX,
  FiCheckCircle,
  FiCalendar,
  FiBook,
  FiLock,
  FiFileText,
} from 'react-icons/fi';
import { lmsService, Certificate } from '@/services/lmsService';
import toast from 'react-hot-toast';

interface CertificateWithStatus extends Certificate {
  is_earned: boolean;
  progress: number;
  is_completed: boolean;
  enrollment?: { progress?: number } | null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: Math.min(i * 0.05, 0.45), ease: [0.22, 1, 0.36, 1] },
  }),
};

function getGradeGradient(grade?: string, isEarned = true) {
  if (!isEarned) return 'from-slate-400 to-slate-600';
  if (!grade) return 'from-lime-500 to-emerald-600';
  switch (grade.toUpperCase()) {
    case 'A':
      return 'from-emerald-400 to-teal-600';
    case 'B':
      return 'from-lime-400 to-emerald-600';
    case 'C':
      return 'from-teal-400 to-cyan-600';
    case 'D':
      return 'from-sky-400 to-teal-500';
    default:
      return 'from-lime-500 to-emerald-600';
  }
}

export default function Certificates() {
  const [certificates, setCertificates] = useState<CertificateWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithStatus | null>(
    null
  );
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getAvailableCertificates();
      setCertificates(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      console.error('Failed to load certificates:', error);
      toast.error('Neuspješno učitavanje certifikata');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (certificate: CertificateWithStatus) => {
    if (!certificate.is_earned || !certificate.id) {
      toast.error('Certifikat još nije osvojen');
      return;
    }

    try {
      setGeneratingPdf(certificate.id);
      if (certificate.file_path) {
        window.open(certificate.file_path, '_blank');
      } else {
        await lmsService.downloadCertificatePdf(certificate.id);
        toast.success('PDF certifikat uspješno generisan');
      }
    } catch (error: any) {
      console.error('Failed to download certificate:', error);
      toast.error(error?.response?.data?.message || 'Neuspješno generisanje PDF certifikata');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const filteredCertificates = certificates.filter((cert) => {
    if (filter === 'earned') return cert.is_earned;
    if (filter === 'locked') return !cert.is_earned;
    return true;
  });

  const earnedCount = certificates.filter((c) => c.is_earned).length;
  const totalCount = certificates.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-lime-200 border-t-lime-600" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-lime-100 bg-gradient-to-br from-white via-lime-50/50 to-emerald-50/30 p-6 shadow-sm dark:border-lime-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-lime-700 dark:text-lime-400">
              Maloprodaja
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              <FiFileText className="text-lime-600" />
              Certifikati
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Osvojite certifikate završavanjem kurseva.
            </p>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-dark-600 dark:bg-dark-900/50">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>Osvojeno</span>
              <span className="font-semibold text-lime-700 dark:text-lime-300">
                {earnedCount} / {totalCount}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-lime-100 dark:bg-lime-950/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-lime-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.2 }}
              />
            </div>
            <div className="mt-3 text-center text-2xl font-bold text-gray-900 dark:text-white">
              {progressPercent}%
            </div>
          </div>
        </div>
      </motion.div>

      <div className="inline-flex rounded-xl border border-lime-200/70 bg-white/80 p-1 shadow-sm dark:border-lime-900/40 dark:bg-dark-800">
        {(
          [
            { value: 'all', label: 'Svi' },
            { value: 'earned', label: 'Osvojeni' },
            { value: 'locked', label: 'Zaključani' },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === option.value
                ? 'bg-lime-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-lime-50 dark:text-gray-300 dark:hover:bg-dark-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredCertificates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-lime-200 bg-lime-50/40 px-6 py-16 text-center dark:border-lime-900/40 dark:bg-lime-950/20">
          <FiAward className="mx-auto mb-3 h-14 w-14 text-lime-500 opacity-70" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nema certifikata</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {filter === 'earned'
              ? 'Još nemate osvojenih certifikata. Nastavite učiti!'
              : filter === 'locked'
                ? 'Nema zaključanih certifikata.'
                : 'Nema dostupnih certifikata.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCertificates.map((certificate, index) => (
            <motion.div
              key={certificate.course_id || `cert-${certificate.id}`}
              custom={index}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              whileHover={{ y: -4 }}
              className={`group relative overflow-hidden rounded-3xl border bg-white shadow-sm ring-1 transition dark:bg-dark-800 ${
                certificate.is_earned
                  ? 'border-lime-200 ring-lime-100 dark:border-lime-800 dark:ring-lime-900/40'
                  : 'border-transparent opacity-80 ring-gray-100 dark:ring-dark-600'
              }`}
            >
              <div className="relative h-44 overflow-hidden">
                {certificate.course?.cover_image ? (
                  <img
                    src={certificate.course.cover_image}
                    alt={certificate.course.title}
                    className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
                      !certificate.is_earned ? 'grayscale opacity-60' : ''
                    }`}
                  />
                ) : (
                  <div
                    className={`flex h-full items-center justify-center bg-gradient-to-br ${getGradeGradient(certificate.grade, certificate.is_earned)}`}
                  >
                    <FiAward className="h-14 w-14 text-white/50" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />

                {!certificate.is_earned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <div className="rounded-full bg-black/45 p-3">
                      <FiLock className="h-7 w-7 text-white" />
                    </div>
                  </div>
                )}

                <div className="absolute right-3 top-3">
                  {certificate.is_earned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                      <FiCheckCircle className="h-3 w-3" />
                      Osvojeno
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-800/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                      <FiLock className="h-3 w-3" />
                      Zaključano
                    </span>
                  )}
                </div>

                {certificate.is_earned && certificate.grade && (
                  <div className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-lime-300 bg-white/90 text-sm font-bold text-lime-700 shadow-sm dark:bg-dark-800/90 dark:text-lime-300">
                    {certificate.grade}
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="mb-2 line-clamp-2 text-base font-bold text-gray-900 dark:text-white">
                  {certificate.course?.title || 'Certifikat'}
                </h3>

                {(certificate.course?.category || certificate.course?.level) && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {certificate.course.category && (
                      <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[11px] font-medium text-lime-800 dark:bg-lime-950/40 dark:text-lime-300">
                        {certificate.course.category}
                      </span>
                    )}
                    {certificate.course.level && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-dark-700 dark:text-gray-300">
                        {certificate.course.level}
                      </span>
                    )}
                  </div>
                )}

                <div className="mb-4 space-y-2">
                  {certificate.is_earned ? (
                    <>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FiCalendar className="h-3.5 w-3.5" />
                        <span>
                          Izdato:{' '}
                          {certificate.issued_at
                            ? new Date(certificate.issued_at).toLocaleDateString('bs-BA', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                      </div>

                      {certificate.final_score !== undefined && certificate.final_score !== null && (
                        <div className="flex items-center justify-between border-t border-lime-100 pt-2 dark:border-lime-900/30">
                          <span className="text-sm text-gray-500">Rezultat</span>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(certificate.final_score).toFixed(1)}%
                          </span>
                        </div>
                      )}

                      {certificate.certificate_number && (
                        <div className="border-t border-lime-100 pt-2 font-mono text-xs text-gray-400 dark:border-lime-900/30">
                          #{certificate.certificate_number}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                        {certificate.course?.description ||
                          'Završite ovaj kurs da osvojite certifikat'}
                      </p>
                      {certificate.enrollment && (
                        <div className="border-t border-lime-100 pt-2 dark:border-lime-900/30">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-gray-500">Napredak</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {certificate.progress}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-lime-100 dark:bg-lime-950/40">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-lime-500 to-emerald-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${certificate.progress}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {certificate.is_earned ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedCertificate(certificate)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-lime-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-lime-700"
                      >
                        <FiEye className="h-4 w-4" />
                        Pregled
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(certificate)}
                        disabled={generatingPdf === certificate.id}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
                      >
                        {generatingPdf === certificate.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <FiDownload className="h-4 w-4" />
                        )}
                        PDF
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          toast.loading('Provjeravam uslove za certifikat...', {
                            id: 'check-cert',
                          });
                          const result = await lmsService.checkAndGenerateCertificate(
                            certificate.course_id
                          );
                          toast.dismiss('check-cert');

                          if (result.eligible && result.certificate_id) {
                            toast.success('Certifikat je uspješno generisan!');
                            await loadCertificates();
                          } else if (result.already_earned) {
                            toast.success('Certifikat već postoji!');
                            await loadCertificates();
                          } else {
                            toast.error(result.message || 'Certifikat još nije dostupan');
                          }
                        } catch (error: any) {
                          toast.dismiss('check-cert');
                          toast.error(
                            error?.response?.data?.message || 'Greška pri provjeri certifikata'
                          );
                        }
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-lime-700"
                    >
                      <FiCheckCircle className="h-4 w-4" />
                      Provjeri uslove
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedCertificate?.is_earned && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          onDownload={() => handleDownloadPdf(selectedCertificate)}
          generatingPdf={generatingPdf === (selectedCertificate.id || null)}
        />
      )}
    </div>
  );
}

function CertificateModal({
  certificate,
  onClose,
  onDownload,
  generatingPdf,
}: {
  certificate: CertificateWithStatus;
  onClose: () => void;
  onDownload: () => void;
  generatingPdf: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-lime-100 bg-white px-4 py-4 dark:border-lime-900/30 dark:bg-dark-800 sm:px-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Certifikat</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div
            className={`relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br ${getGradeGradient(certificate.grade, true)} p-4 text-center sm:p-8`}
          >
            <div className="absolute left-0 top-0 h-40 w-40 -translate-x-20 -translate-y-20 rounded-full bg-white/10" />
            <div className="absolute bottom-0 right-0 h-40 w-40 translate-x-20 translate-y-20 rounded-full bg-white/10" />

            <div className="relative z-10">
              <FiAward className="mx-auto mb-4 h-20 w-20 text-white drop-shadow-lg" />
              <h3 className="mb-2 text-2xl font-bold text-white drop-shadow-md">
                CERTIFIKAT O ZAVRŠETKU
              </h3>
              <div className="mx-auto my-4 h-px w-32 bg-white/30" />
              <p className="mb-6 text-sm text-white/90">Ovim se potvrđuje da je</p>
              <p className="mb-6 text-xl font-semibold text-white">
                {certificate.course?.title || 'Kurs'}
              </p>
              <p className="mb-4 text-sm text-white/90">uspješno završen dana</p>
              <p className="mb-6 font-semibold text-white">
                {certificate.issued_at
                  ? new Date(certificate.issued_at).toLocaleDateString('bs-BA', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </p>

              {certificate.final_score !== undefined && certificate.final_score !== null && (
                <div className="mt-6 border-t border-white/30 pt-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
                      <p className="mb-1 text-xs text-white/80">Rezultat</p>
                      <p className="text-2xl font-bold text-white">
                        {Number(certificate.final_score).toFixed(1)}%
                      </p>
                    </div>
                    {certificate.grade && (
                      <div className="rounded-xl bg-white/20 px-4 py-2 backdrop-blur-sm">
                        <p className="mb-1 text-xs text-white/80">Ocjena</p>
                        <p className="text-2xl font-bold text-white">{certificate.grade}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {certificate.certificate_number && (
                <div className="mt-6 font-mono text-xs text-white/70">
                  #{certificate.certificate_number}
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <FiBook className="h-5 w-5 text-lime-600" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Kurs</p>
                <p>{certificate.course?.title || 'N/A'}</p>
              </div>
            </div>

            {certificate.issued_at && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <FiCalendar className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Datum izdavanja</p>
                  <p>
                    {new Date(certificate.issued_at).toLocaleDateString('bs-BA', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onDownload}
              disabled={generatingPdf}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-600 px-4 py-3 font-medium text-white transition hover:from-lime-600 hover:to-emerald-700 disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generisanje PDF-a...
                </>
              ) : (
                <>
                  <FiDownload className="h-5 w-5" />
                  Preuzmi PDF certifikat
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-100 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
            >
              Zatvori
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
