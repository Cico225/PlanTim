import { useState, useEffect } from 'react';
import { FiAward, FiDownload, FiEye, FiX, FiCheckCircle, FiCalendar, FiBook, FiLock } from 'react-icons/fi';
import { lmsService, Certificate } from '@/services/lmsService';
import toast from 'react-hot-toast';

interface CertificateWithStatus extends Certificate {
  is_earned: boolean;
  progress: number;
  is_completed: boolean;
  enrollment?: any;
}

export default function Certificates() {
  const [certificates, setCertificates] = useState<CertificateWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithStatus | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getAvailableCertificates();
      console.log('Loaded available certificates:', data);
      setCertificates(Array.isArray(data) ? data : []);
    } catch (error: any) {
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
        // If file already exists, open it
        window.open(certificate.file_path, '_blank');
      } else {
        // Generate PDF on demand
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

  const getGradeColor = (grade?: string) => {
    if (!grade) return 'from-yellow-400 to-yellow-600';
    switch (grade.toUpperCase()) {
      case 'A': return 'from-green-400 to-emerald-600';
      case 'B': return 'from-blue-400 to-blue-600';
      case 'C': return 'from-yellow-400 to-amber-600';
      case 'D': return 'from-orange-400 to-orange-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    if (filter === 'earned') return cert.is_earned;
    if (filter === 'locked') return !cert.is_earned;
    return true;
  });

  const earnedCount = certificates.filter(c => c.is_earned).length;
  const totalCount = certificates.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiAward className="text-amber-500" />
            Certifikati
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Osvojite certifikate završavanjem kurseva
          </p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100">Osvojeni certifikati</p>
            <p className="text-4xl font-bold">{earnedCount} / {totalCount}</p>
          </div>
          <FiAward className="w-16 h-16 text-white/30" />
        </div>
        <div className="w-full bg-white/30 rounded-full h-3">
          <div 
            className="bg-white h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { value: 'all', label: 'Svi' },
          { value: 'earned', label: 'Osvojeni' },
          { value: 'locked', label: 'Zaključani' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Certificates Grid */}
      {filteredCertificates.length === 0 ? (
        <div className="card p-12 text-center">
          <FiAward className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Nema certifikata
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'earned' 
              ? 'Još nemate osvojenih certifikata. Nastavite učiti!'
              : filter === 'locked'
              ? 'Nema zaključanih certifikata.'
              : 'Nema dostupnih certifikata.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <div 
              key={certificate.course_id || `cert-${certificate.id}`} 
              className={`card p-0 transition-all duration-300 hover:shadow-xl border-2 relative overflow-hidden group ${
                certificate.is_earned 
                  ? 'border-blue-400 dark:border-blue-500' 
                  : 'opacity-70 hover:opacity-100 border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Certificate Preview Image */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                {certificate.course?.cover_image ? (
                  <img
                    src={certificate.course.cover_image}
                    alt={certificate.course.title}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                      !certificate.is_earned ? 'grayscale opacity-50' : ''
                    }`}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${getGradeColor(certificate.grade, certificate.is_earned)}`}>
                    <FiAward className="w-16 h-16 text-white/50" />
                  </div>
                )}
                
                {/* Overlay for locked certificates */}
                {!certificate.is_earned && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-4">
                      <FiLock className="w-8 h-8 text-white" />
                    </div>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {certificate.is_earned ? (
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <FiCheckCircle className="w-3 h-3" />
                      Osvojeno
                    </span>
                  ) : (
                    <span className="bg-gray-700/80 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <FiLock className="w-3 h-3" />
                      Zaključano
                    </span>
                  )}
                </div>
                
                {/* Grade Badge (if earned) */}
                {certificate.is_earned && certificate.grade && (
                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-2 border-blue-300">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{certificate.grade}</span>
                  </div>
                )}
              </div>
              
              <div className="relative z-10 p-6">

                {/* Certificate Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {certificate.course?.title || 'Certifikat'}
                </h3>

                {/* Course Info - Za šta se može osvojiti */}
                {(certificate.course?.category || certificate.course?.level) && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {certificate.course.category && (
                      <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        {certificate.course.category}
                      </span>
                    )}
                    {certificate.course.level && (
                      <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                        {certificate.course.level}
                      </span>
                    )}
                  </div>
                )}

                {/* Certificate Info */}
                <div className="space-y-2 mb-4">
                  {certificate.is_earned ? (
                    <>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <FiCalendar className="w-3 h-3" />
                        <span>
                          Izdato: {certificate.issued_at 
                            ? new Date(certificate.issued_at).toLocaleDateString('bs-BA', { 
                                day: 'numeric', 
                                month: 'short', 
                                year: 'numeric' 
                              })
                            : 'N/A'}
                        </span>
                      </div>
                      
                      {certificate.final_score !== undefined && certificate.final_score !== null && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Rezultat:</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-bold ${Number(certificate.final_score) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : Number(certificate.final_score) >= 60 ? 'text-blue-600 dark:text-blue-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                              {Number(certificate.final_score).toFixed(1)}%
                            </span>
                            {certificate.grade && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                                {certificate.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {certificate.certificate_number && (
                        <div className="text-xs text-gray-400 dark:text-gray-600 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="font-mono">#{certificate.certificate_number}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {certificate.course?.description ? (
                          <span className="line-clamp-2">{certificate.course.description}</span>
                        ) : (
                          'Završite ovaj kurs da osvojite certifikat'
                        )}
                      </p>
                      {certificate.enrollment && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Napredak</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{certificate.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${certificate.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {!certificate.enrollment && certificate.course?.duration && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span>Trajanje: ~{certificate.course.duration} min</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {certificate.is_earned ? (
                    <>
                      <button
                        onClick={() => setSelectedCertificate(certificate)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <FiEye className="w-4 h-4" />
                        Pregled
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(certificate)}
                        disabled={generatingPdf === certificate.id}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {generatingPdf === certificate.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generisanje...</span>
                          </>
                        ) : (
                          <>
                            <FiDownload className="w-4 h-4" />
                            PDF
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          toast.loading('Proveravam uslove za certifikat...', { id: 'check-cert' });
                          console.log('Checking certificate for course:', certificate.course_id);
                          const result = await lmsService.checkAndGenerateCertificate(certificate.course_id);
                          console.log('Certificate check result:', result);
                          toast.dismiss('check-cert');
                          
                          if (result.eligible && result.certificate_id) {
                            toast.success('Certifikat je uspešno generisan!');
                            await loadCertificates(); // Reload certificates
                          } else if (result.already_earned) {
                            toast.success('Certifikat već postoji!');
                            await loadCertificates(); // Reload certificates
                          } else {
                            toast.error(result.message || 'Certifikat još nije dostupan');
                          }
                        } catch (error: any) {
                          toast.dismiss('check-cert');
                          console.error('Certificate check error:', error);
                          console.error('Error response:', error?.response?.data);
                          toast.error(error?.response?.data?.message || 'Greška pri proveri certifikata');
                        }
                      }}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      Proveri uslove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Preview Modal */}
      {selectedCertificate && selectedCertificate.is_earned && (
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
  generatingPdf 
}: { 
  certificate: CertificateWithStatus; 
  onClose: () => void;
  onDownload: () => void;
  generatingPdf: boolean;
}) {
  const getGradeColor = (grade?: string, isEarned?: boolean) => {
    // Za osvojene certifikate koristimo plavu/zelenu paletu
    if (isEarned) {
      if (!grade) return 'from-blue-400 to-cyan-600';
      switch (grade.toUpperCase()) {
        case 'A': return 'from-emerald-400 to-teal-600';
        case 'B': return 'from-blue-400 to-indigo-600';
        case 'C': return 'from-cyan-400 to-blue-600';
        case 'D': return 'from-sky-400 to-blue-500';
        default: return 'from-blue-400 to-cyan-600';
      }
    }
    return 'from-gray-400 to-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Certifikat</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {/* Certificate Preview */}
          <div className={`relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br ${getGradeColor(certificate.grade, true)} p-4 text-center sm:p-8`}>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-20 translate-y-20"></div>
            
            <div className="relative z-10">
              <FiAward className="w-20 h-20 text-white mx-auto mb-4 drop-shadow-lg" />
              <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-md">
                CERTIFIKAT O ZAVRŠETKU
              </h3>
              <div className="h-px bg-white/30 w-32 mx-auto my-4"></div>
              <p className="text-white/90 text-sm mb-6">
                Ovim se potvrđuje da je
              </p>
              <p className="text-white text-xl font-semibold mb-6">
                {certificate.course?.title || 'Kurs'}
              </p>
              <p className="text-white/90 text-sm mb-4">
                uspješno završen dana
              </p>
              <p className="text-white font-semibold mb-6">
                {certificate.issued_at 
                  ? new Date(certificate.issued_at).toLocaleDateString('bs-BA', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })
                  : 'N/A'}
              </p>
              
              {certificate.final_score !== undefined && certificate.final_score !== null && (
                <div className="mt-6 pt-6 border-t border-white/30">
                  <div className="flex items-center justify-center gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                      <p className="text-white/80 text-xs mb-1">Rezultat</p>
                      <p className="text-white text-2xl font-bold">{Number(certificate.final_score).toFixed(1)}%</p>
                    </div>
                    {certificate.grade && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-white/80 text-xs mb-1">Ocjena</p>
                        <p className="text-white text-2xl font-bold">{certificate.grade}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {certificate.certificate_number && (
                <div className="mt-6 text-white/70 text-xs font-mono">
                  #{certificate.certificate_number}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <FiBook className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Kurs</p>
                <p>{certificate.course?.title || 'N/A'}</p>
              </div>
            </div>
            
            {certificate.issued_at && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <FiCalendar className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Datum izdavanja</p>
                  <p>{new Date(certificate.issued_at).toLocaleDateString('bs-BA', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}</p>
                </div>
              </div>
            )}

            {certificate.certificate_number && (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <FiCheckCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Broj certifikata</p>
                  <p className="font-mono text-sm">{certificate.certificate_number}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onDownload}
              disabled={generatingPdf}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generisanje PDF-a...</span>
                </>
              ) : (
                <>
                  <FiDownload className="w-5 h-5" />
                  Preuzmi PDF certifikat
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Zatvori
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
