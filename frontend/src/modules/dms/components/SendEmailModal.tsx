import { useState } from 'react';
import { FiX, FiMail, FiSend } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface Document {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
}

interface SendEmailModalProps {
  document: Document;
  onClose: () => void;
}

export default function SendEmailModal({ document, onClose }: SendEmailModalProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(`Dokument: ${document.original_name}`);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Molimo unesite email adresu');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Molimo unesite validnu email adresu');
      return;
    }

    setLoading(true);
    try {
      await apiService.post(`/dms/documents/${document.id}/send-email`, {
        email: email.trim(),
        subject: subject.trim() || `Dokument: ${document.original_name}`,
        message: message.trim(),
      });
      toast.success('Email uspješno poslan');
      onClose();
    } catch (error: any) {
      console.error('Error sending email:', error);
      const errorMessage = error.response?.data?.message || 'Greška pri slanju email-a';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-600 sm:p-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <FiMail className="shrink-0 text-primary-600 dark:text-primary-400" size={20} />
            <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Pošalji dokument mailom</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email adresa <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="primer@email.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Predmet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Predmet email-a"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Poruka
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Dodatna poruka (opciono)"
              disabled={loading}
            />
          </div>

          <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Dokument koji se šalje:</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{document.original_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {(document.size / 1024).toFixed(2)} KB
            </p>
          </div>

          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 p-4 dark:border-dark-600 sm:flex-row sm:p-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-secondary flex-1"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Slanje...
                </>
              ) : (
                <>
                  <FiSend size={16} />
                  Pošalji
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






