import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiDatabase,
  FiDownload,
  FiUpload,
  FiTrash2,
  FiRefreshCw,
  FiSave,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiHardDrive,
  FiInfo,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface BackupFile {
  filename: string;
  size: number;
  size_formatted: string;
  created_at: string;
  path: string;
}

interface BackupStats {
  total_backups: number;
  total_size: number;
  total_size_formatted: string;
  backup_dir: string;
  backup_dir_exists: boolean;
  mysql_path: string | null;
  mysqldump_path: string | null;
}

export default function DatabaseBackup() {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    fetchBackups();
    fetchStats();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await apiService.get<{ backups: BackupFile[] }>('/admin/database-backup/list');
      setBackups(response.backups || []);
    } catch (error: any) {
      console.error('Error fetching backups:', error);
      toast.error('Greška pri učitavanju backup fajlova');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiService.get<BackupStats>('/admin/database-backup/stats');
      setStats(data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const response = await apiService.post('/admin/database-backup/create');
      toast.success(response.message || 'Backup je uspješno kreiran');
      await fetchBackups();
      await fetchStats();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Greška pri kreiranju backup-a');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/database-backup/download/${filename}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup je uspješno preuzet');
    } catch (error: any) {
      console.error('Error downloading backup:', error);
      toast.error('Greška pri preuzimanju backup-a');
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    setRestoring(true);
    try {
      const response = await apiService.post('/admin/database-backup/restore', {
        filename,
      });
      toast.success(response.message || 'Baza podataka je uspješno restaurirana');
      setShowRestoreConfirm(false);
      setSelectedBackup(null);
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Greška pri restore-u baze podataka');
    } finally {
      setRestoring(false);
    }
  };

  const handleUploadAndRestore = async () => {
    if (!uploadFile) {
      toast.error('Molimo izaberite fajl za upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await apiService.upload('/admin/database-backup/upload-restore', formData);

      toast.success(response.message || 'Baza podataka je uspješno restaurirana iz uploadovanog fajla');
      setUploadFile(null);
      await fetchBackups();
      await fetchStats();
    } catch (error: any) {
      console.error('Error uploading and restoring:', error);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Greška pri upload-u i restore-u');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await apiService.delete(`/admin/database-backup/${filename}`);
      toast.success('Backup fajl je uspješno obrisan');
      setShowDeleteConfirm(null);
      await fetchBackups();
      await fetchStats();
    } catch (error: any) {
      console.error('Error deleting backup:', error);
      toast.error(error.response?.data?.error || 'Greška pri brisanju backup-a');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FiDatabase className="text-primary-600 dark:text-primary-400" />
          Backup i Restore Baze Podataka
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upravljajte backup fajlovima i restaurirajte bazu podataka
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Backup-ova</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total_backups}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FiDatabase className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ukupna Veličina</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.total_size_formatted}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <FiHardDrive className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">MySQL Status</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {stats.mysqldump_path ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <FiCheckCircle size={16} />
                      Dostupan
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                      <FiAlertTriangle size={16} />
                      Nije pronađen
                    </span>
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <FiInfo className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Alert */}
      <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-3">
          <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              Upozorenje
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Restore operacija će zamjeniti sve podatke u bazi. Preporučujemo da napravite backup prije restore-a.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleCreateBackup}
          disabled={creating || !stats?.mysqldump_path}
          className="btn-primary flex items-center gap-2"
        >
          {creating ? (
            <>
              <FiRefreshCw className="animate-spin" />
              Kreiranje...
            </>
          ) : (
            <>
              <FiSave />
              Kreiraj Backup
            </>
          )}
        </button>

        <button
          onClick={fetchBackups}
          className="btn-secondary flex items-center gap-2"
        >
          <FiRefreshCw />
          Osvježi listu
        </button>
      </div>

      {/* Upload and Restore Section */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiUpload />
          Upload i Restore
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Izaberite SQL fajl za restore
            </label>
            <input
              type="file"
              accept=".sql"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                dark:file:bg-primary-900/20 dark:file:text-primary-300"
            />
          </div>
          {uploadFile && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FiCheckCircle className="text-green-600 dark:text-green-400" />
              Izabran fajl: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
          <button
            onClick={handleUploadAndRestore}
            disabled={!uploadFile || uploading}
            className="btn-primary flex items-center gap-2"
          >
            {uploading ? (
              <>
                <FiRefreshCw className="animate-spin" />
                Upload i Restore...
              </>
            ) : (
              <>
                <FiUpload />
                Upload i Restore
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FiDatabase />
          Lista Backup Fajlova
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <FiRefreshCw className="animate-spin mx-auto text-primary-600 dark:text-primary-400" size={32} />
            <p className="text-gray-600 dark:text-gray-400 mt-2">Učitavanje...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <FiDatabase className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-600 dark:text-gray-400 mt-4">Nema backup fajlova</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Kliknite na "Kreiraj Backup" da napravite prvi backup
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Fajl
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Veličina
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Datum Kreiranja
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Akcije
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr
                    key={backup.filename}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FiDatabase className="text-primary-600 dark:text-primary-400" size={16} />
                        <span className="font-mono text-sm text-gray-900 dark:text-white">
                          {backup.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {backup.size_formatted}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <FiClock size={14} />
                        {formatDate(backup.created_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownloadBackup(backup.filename)}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Preuzmi"
                        >
                          <FiDownload size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBackup(backup.filename);
                            setShowRestoreConfirm(true);
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Restore"
                        >
                          <FiRefreshCw size={18} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(backup.filename)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Obriši"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Potvrdite Restore
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Da li ste sigurni da želite da restaurirate bazu podataka iz fajla{' '}
                  <strong className="font-mono">{selectedBackup}</strong>?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold mb-4">
                  ⚠️ Ova operacija će zamjeniti sve postojeće podatke u bazi!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRestoreConfirm(false);
                      setSelectedBackup(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Otkaži
                  </button>
                  <button
                    onClick={() => handleRestoreBackup(selectedBackup)}
                    disabled={restoring}
                    className="btn-danger flex-1 flex items-center justify-center gap-2"
                  >
                    {restoring ? (
                      <>
                        <FiRefreshCw className="animate-spin" />
                        Restore...
                      </>
                    ) : (
                      'Potvrdi Restore'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <FiTrash2 className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Potvrdite Brisanje
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Da li ste sigurni da želite da obrišete backup fajl{' '}
                  <strong className="font-mono">{showDeleteConfirm}</strong>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="btn-secondary flex-1"
                  >
                    Otkaži
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(showDeleteConfirm)}
                    className="btn-danger flex-1"
                  >
                    Obriši
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

