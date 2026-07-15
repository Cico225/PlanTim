import { useState, useEffect } from 'react';
import { FiX, FiFolder, FiMove } from 'react-icons/fi';
import { apiService } from '@/services/api';

interface Folder {
  id: number;
  name: string;
  parent_folder_id?: number | null;
  path?: string;
  children?: Folder[];
}

interface MoveDocumentModalProps {
  folders: Folder[];
  currentFolderId: number | null;
  onClose: () => void;
  onMove: (folderId: number | null) => void;
}

export default function MoveDocumentModal({
  folders: _folders,
  currentFolderId,
  onClose,
  onMove,
}: MoveDocumentModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all folders from tree endpoint to get full hierarchy
  useEffect(() => {
    const loadAllFolders = async () => {
      try {
        const tree = await apiService.get('/dms/folders/tree');
        // Flatten tree structure to flat list
        const flattenTree = (folders: Folder[]): Folder[] => {
          const result: Folder[] = [];
          folders.forEach((folder) => {
            const { children, ...folderWithoutChildren } = folder;
            result.push(folderWithoutChildren as Folder);
            if (children && children.length > 0) {
              result.push(...flattenTree(children));
            }
          });
          return result;
        };
        setAllFolders(flattenTree(tree || []));
      } catch (error) {
        console.error('Error loading folders:', error);
        // Fallback to provided folders if tree endpoint fails
        setAllFolders(_folders);
      } finally {
        setLoading(false);
      }
    };

    loadAllFolders();
  }, [_folders]);

  const handleMove = () => {
    onMove(selectedFolder);
  };

  // Check if folder is a descendant of current folder (follow parent chain up to root)
  const isDescendantOfCurrentFolder = (folderId: number, currentId: number | null): boolean => {
    if (currentId === null) return false;
    let currentFolderId: number | null | undefined = folderId;
    
    // Follow parent chain up to root
    while (currentFolderId !== null && currentFolderId !== undefined) {
      const folder = allFolders.find((f) => f.id === currentFolderId);
      if (!folder) break;
      
      // If parent is the current folder, this folder is a descendant
      if (folder.parent_folder_id === currentId) return true;
      
      // Move up to parent
      currentFolderId = folder.parent_folder_id;
    }
    
    return false;
  };

  // Build tree structure for better visualization using all folders
  const buildTree = (parentId: number | null = null, level: number = 0): JSX.Element[] => {
    return allFolders
      .filter((f) => {
        // Skip current folder and all its children/descendants
        if (f.id === currentFolderId) return false;
        if (currentFolderId !== null && isDescendantOfCurrentFolder(f.id, currentFolderId)) return false;
        
        // Filter by parent
        if (parentId === null) {
          return f.parent_folder_id === null || f.parent_folder_id === undefined;
        }
        return f.parent_folder_id === parentId;
      })
      .map((folder) => (
        <div key={folder.id}>
          <button
            onClick={() => setSelectedFolder(folder.id)}
            className={`w-full text-left py-2 px-3 rounded-lg flex items-center gap-2 ${
              selectedFolder === folder.id
                ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-300'
            }`}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
          >
            <FiFolder size={18} />
            <span>{folder.name}</span>
          </button>
          {buildTree(folder.id, level + 1)}
        </div>
      ));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-600 sm:p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Premjesti Dokument</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Izaberite folder u koji želite premjestiti dokument:
          </p>

          <div className="mb-4 min-h-0 flex-1 space-y-1 overflow-y-auto sm:mb-6 sm:max-h-96">
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Učitavanje foldera...
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`w-full text-left py-2 px-3 rounded-lg flex items-center gap-2 ${
                    selectedFolder === null
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <FiFolder size={18} />
                  <span>Root (Bez foldera)</span>
                </button>
                {buildTree()}
              </>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button onClick={handleMove} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <FiMove size={18} />
              Premjesti
            </button>
            <button onClick={onClose} className="btn-secondary flex-1">
              Otkaži
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

