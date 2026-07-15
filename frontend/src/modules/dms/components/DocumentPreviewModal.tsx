import { useState, useEffect } from 'react';
import { FiX, FiDownload, FiMove, FiClock, FiTrash2, FiMail, FiEye } from 'react-icons/fi';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface Document {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  folder_id?: number;
  folder_name?: string;
  uploaded_by_name: string;
  created_at: string;
  updated_at?: string;
  version?: number;
}

interface DocumentPreviewModalProps {
  document: Document;
  onClose: () => void;
  onDownload: (doc: Document) => void;
  onMove: (doc: Document) => void;
  onVersionHistory: (doc: Document) => void;
  onDelete: (id: number) => void;
  onSendEmail: (doc: Document) => void;
}

export default function DocumentPreviewModal({
  document,
  onClose,
  onDownload,
  onMove,
  onVersionHistory,
  onDelete,
  onSendEmail,
}: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Generate preview URL for supported file types
    const generatePreview = async () => {
      if (document.mime_type.startsWith('image/')) {
        // For images, create blob URL
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/dms/documents/${document.id}/download`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          }
        } catch (error) {
          console.error('Error loading image preview:', error);
        } finally {
          setLoading(false);
        }
      } else if (document.mime_type.includes('pdf')) {
        // For PDFs, fetch as blob and create object URL for direct display in iframe
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/dms/documents/${document.id}/download`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const blob = await response.blob();
            // Create blob URL with proper PDF type
            const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            setPreviewUrl(url);
          } else {
            const errorText = await response.text();
            console.error('Failed to load PDF preview:', response.status, errorText);
            toast.error('Greška pri učitavanju PDF pregleda');
          }
        } catch (error: any) {
          console.error('Error loading PDF preview:', error);
          toast.error('Greška pri učitavanju PDF pregleda: ' + (error.message || 'Nepoznata greška'));
        } finally {
          setLoading(false);
        }
      } else if (
        document.mime_type.includes('word') || 
        document.mime_type.includes('document') ||
        document.original_name.toLowerCase().endsWith('.doc') ||
        document.original_name.toLowerCase().endsWith('.docx') ||
        document.mime_type.includes('excel') || 
        document.mime_type.includes('spreadsheet') ||
        document.original_name.toLowerCase().endsWith('.xls') ||
        document.original_name.toLowerCase().endsWith('.xlsx')
      ) {
        // Word and Excel documents cannot be displayed directly in browser
        // Set previewUrl to null to show download message instead
        setPreviewUrl(null);
        setLoading(false);
      }
    };

    generatePreview();

    // Cleanup blob URL on unmount
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [document.id, document.mime_type, document.original_name]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  };

  const canPreview = 
    document.mime_type.startsWith('image/') || 
    document.mime_type.includes('pdf') ||
    document.mime_type.includes('word') ||
    document.mime_type.includes('document') ||
    document.mime_type.includes('excel') ||
    document.mime_type.includes('spreadsheet') ||
    document.original_name.toLowerCase().match(/\.(doc|docx|xls|xlsx)$/i);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-600 sm:p-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="text-3xl flex-shrink-0">{getFileIcon(document.mime_type)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {document.original_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {document.mime_type} • {formatFileSize(document.size)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 ml-4"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {canPreview ? (
            loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-4">Učitavanje pregleda...</p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="flex items-center justify-center h-full">
                {document.mime_type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt={document.original_name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  />
                ) : document.mime_type.includes('word') || 
                  document.mime_type.includes('document') ||
                  document.mime_type.includes('excel') ||
                  document.mime_type.includes('spreadsheet') ||
                  document.original_name.toLowerCase().match(/\.(doc|docx|xls|xlsx)$/i) ? (
                  <div className="w-full h-[60vh] rounded-lg border border-gray-300 dark:border-dark-600 flex items-center justify-center bg-gray-50 dark:bg-dark-700">
                    <div className="text-center p-6 max-w-md">
                      <div className="text-6xl mb-4">{getFileIcon(document.mime_type)}</div>
                      <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
                        Word i Excel fajlovi se ne mogu prikazati direktno u pregledaču
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Molimo preuzmite fajl da biste ga otvorili u odgovarajućoj aplikaciji.
                      </p>
                      <button
                        onClick={() => onDownload(document)}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <FiDownload size={16} />
                        Preuzmi fajl
                      </button>
                    </div>
                  </div>
                ) : document.mime_type.includes('pdf') ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[60vh] rounded-lg border border-gray-300 dark:border-dark-600"
                    title={document.original_name}
                    allow="fullscreen"
                    type="application/pdf"
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[60vh] rounded-lg border border-gray-300 dark:border-dark-600"
                    title={document.original_name}
                    allow="fullscreen"
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  {(document.mime_type.includes('word') || 
                    document.mime_type.includes('document') ||
                    document.mime_type.includes('excel') ||
                    document.mime_type.includes('spreadsheet') ||
                    document.original_name.toLowerCase().match(/\.(doc|docx|xls|xlsx)$/i)) ? (
                    <div className="w-full max-w-md mx-auto p-6">
                      <div className="text-6xl mb-4">{getFileIcon(document.mime_type)}</div>
                      <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
                        Word i Excel fajlovi se ne mogu prikazati direktno u pregledaču
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Molimo preuzmite fajl da biste ga otvorili u odgovarajućoj aplikaciji.
                      </p>
                      <button
                        onClick={() => onDownload(document)}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <FiDownload size={16} />
                        Preuzmi fajl
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">Nije moguće prikazati pregled ovog tipa fajla</p>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">{getFileIcon(document.mime_type)}</div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Pregled nije dostupan za ovaj tip fajla
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Preuzmite fajl da biste ga otvorili
                </p>
              </div>
            </div>
          )}

          {/* Document Details */}
          <div className="mt-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-dark-700 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verzija
              </label>
              <p className="text-sm text-gray-900 dark:text-white">{document.version || 1}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Uploadovao
              </label>
              <p className="text-sm text-gray-900 dark:text-white">{document.uploaded_by_name}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Folder
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {document.folder_name || 'Root'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kreiran
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {format(new Date(document.created_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
              </p>
            </div>
            {document.updated_at && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ažuriran
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {format(new Date(document.updated_at), 'dd.MM.yyyy HH:mm', { locale: sr })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t border-gray-200 p-4 dark:border-dark-600 sm:p-6">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button
              onClick={() => {
                onDownload(document);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors text-sm"
            >
              <FiDownload size={16} />
              <span>Preuzmi</span>
            </button>
            <button
              onClick={() => {
                onMove(document);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors text-sm"
            >
              <FiMove size={16} />
              <span>Premjesti</span>
            </button>
            <button
              onClick={() => {
                onVersionHistory(document);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm"
            >
              <FiClock size={16} />
              <span>Verzije</span>
            </button>
            <button
              onClick={() => {
                onSendEmail(document);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors text-sm"
            >
              <FiMail size={16} />
              <span>Pošalji mailom</span>
            </button>
            <button
              onClick={() => {
                if (confirm('Da li ste sigurni da želite obrisati ovaj dokument?')) {
                  onDelete(document.id);
                  onClose();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors text-sm"
            >
              <FiTrash2 size={16} />
              <span>Obriši</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

