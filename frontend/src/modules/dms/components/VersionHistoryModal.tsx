import { useState, useEffect } from 'react';
import {
  FiX,
  FiClock,
  FiUser,
  FiDownload,
  FiCheckCircle,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';

interface Version {
  id?: number;
  version: number;
  size?: number;
  file_size?: number;
  uploaded_by_name?: string;
  created_at: string;
  changes?: string;
  changes_description?: string;
  is_current?: boolean;
}

interface VersionHistoryModalProps {
  documentId: number;
  documentName: string;
  onClose: () => void;
}

export default function VersionHistoryModal({
  documentId,
  documentName,
  onClose,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVersions();
  }, [documentId]);

  const fetchVersions = async () => {
    try {
      const data = await apiService.get(`/dms/documents/${documentId}/versions`);
      setCurrentVersion(data.current);
      setVersions(data.versions || []);
    } catch (error) {
      toast.error('Greška pri učitavanju verzija');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVersion = async (versionId: number) => {
    try {
      await apiService.download(
        `/dms/documents/${documentId}/versions/${versionId}/download`,
        documentName
      );
      toast.success('Preuzimanje započeto');
    } catch (error) {
      toast.error('Greška pri preuzimanju verzije');
    }
  };

  const formatFileSize = (bytes: number | undefined | null) => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy. HH:mm', { locale: sr });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-600 sm:p-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Istorija Verzija</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{documentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Učitavanje...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Version */}
              {currentVersion && (
                <div className="border-2 border-green-500 dark:border-green-600 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FiCheckCircle className="text-green-600 dark:text-green-400" size={20} />
                        <span className="font-semibold text-green-900 dark:text-green-100">
                          Verzija {currentVersion.version} (Trenutna)
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <FiUser size={14} />
                          {currentVersion.uploaded_by_name}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <FiClock size={14} />
                          {formatDateTime(currentVersion.created_at)}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          Veličina: {formatFileSize(currentVersion.size || currentVersion.file_size)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Previous Versions */}
              {versions.length > 0 ? (
                versions.map((version) => (
                  <div
                    key={version.version}
                    className="border border-gray-200 dark:border-dark-600 rounded-lg p-4 hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 font-semibold text-gray-900 dark:text-white">
                          Verzija {version.version}
                        </div>
                        {(version.changes_description || version.changes) && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {version.changes_description || version.changes}
                          </p>
                        )}
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <FiUser size={14} />
                            {version.uploaded_by_name}
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <FiClock size={14} />
                            {formatDateTime(version.created_at)}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Veličina: {formatFileSize(version.size || version.file_size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadVersion(version.id || version.version)}
                        className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
                      >
                        <FiDownload size={16} />
                        Preuzmi
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  Nema prethodnih verzija
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

