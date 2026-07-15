import { FiCheckCircle, FiXCircle, FiTrash2, FiX } from 'react-icons/fi';

interface BulkActionsBarProps {
  selectedCount: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BulkActionsBar({
  selectedCount,
  onActivate,
  onDeactivate,
  onDelete,
  onCancel,
}: BulkActionsBarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-600 p-4 flex items-center gap-4">
        {/* Selected Count */}
        <div className="flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
          <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
            {selectedCount} {selectedCount === 1 ? 'korisnik' : 'korisnika'} izabrano
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onActivate}
            className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors flex items-center gap-2"
          >
            <FiCheckCircle size={18} />
            Aktiviraj
          </button>

          <button
            onClick={onDeactivate}
            className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors flex items-center gap-2"
          >
            <FiXCircle size={18} />
            Deaktiviraj
          </button>

          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
          >
            <FiTrash2 size={18} />
            Obriši
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors ml-2"
          title="Otkaži selekciju"
        >
          <FiX size={20} />
        </button>
      </div>
    </div>
  );
}






