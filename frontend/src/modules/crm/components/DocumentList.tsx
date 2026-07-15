import { useState, useEffect } from 'react';
import { FiUpload, FiFile, FiDownload, FiTrash2, FiFileText } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface Document {
  id: number;
  name: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  uploaded_at: string;
}

interface DocumentListProps {
  entityType: 'account' | 'contact' | 'deal';
  entityId: number;
}

export default function DocumentList({ entityType, entityId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [entityType, entityId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/crm/${entityType}/${entityId}/documents`);
      setDocuments(response || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Greška pri učitavanju dokumenata');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('file_type', file.type);

      await apiService.upload(`/crm/${entityType}/${entityId}/documents`, formData);

      toast.success('Dokument uspješno uploadovan');
      loadDocuments();
    } catch (error: any) {
      console.error('Failed to upload document:', error);
      toast.error(error.response?.data?.error || 'Greška pri uploadu dokumenta');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      await apiService.download(`/crm/documents/${documentId}/download`, fileName);
      toast.success('Preuzimanje započeto');
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Greška pri preuzimanju dokumenta');
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj dokument?')) {
      return;
    }

    try {
      await apiService.delete(`/crm/documents/${documentId}`);
      toast.success('Dokument uspješno obrisan');
      loadDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Greška pri brisanju dokumenta');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dokumenti</h2>
        <label className="btn-primary flex items-center gap-2 cursor-pointer">
          <FiUpload />
          {uploading ? 'Upload...' : 'Upload Dokument'}
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <FiFileText className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mt-4">Nema dokumenata</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FiFile className="text-gray-400" size={24} />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{doc.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(doc.file_size)} • {doc.file_type || 'Dokument'} • {new Date(doc.uploaded_at).toLocaleDateString('bs-BA')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(doc.id, doc.name)}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  <FiDownload size={18} />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

