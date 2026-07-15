import { useState } from 'react';
import {
  FiFolder,
  FiFolderPlus,
  FiChevronRight,
  FiChevronDown,
  FiTrash2,
} from 'react-icons/fi';

interface Folder {
  id: number;
  name: string;
  parent_folder_id?: number | null;
  documents_count?: number;
  subfolders?: Folder[];
}

interface FolderTreeProps {
  folders: Folder[];
  selectedFolder: number | null;
  onSelectFolder: (folderId: number | null) => void;
  onCreateFolder: (parentId?: number) => void;
  onDeleteFolder: (folderId: number) => void;
}

export default function FolderTree({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // Build tree structure
  const buildTree = (parentId: number | null = null): Folder[] => {
    return folders
      .filter((f) => f.parent_folder_id === parentId)
      .map((folder) => ({
        ...folder,
        subfolders: buildTree(folder.id),
      }));
  };

  const toggleExpand = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder: Folder, level: number = 0) => {
    const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolder === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group transition-colors ${
            isSelected
              ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
              : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasSubfolders && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? (
                <FiChevronDown size={16} />
              ) : (
                <FiChevronRight size={16} />
              )}
            </button>
          )}
          
          <div
            onClick={() => onSelectFolder(folder.id)}
            className="flex items-center gap-2 flex-1"
          >
            <FiFolder size={18} />
            <span className="font-medium">{folder.name}</span>
            {folder.documents_count !== undefined && folder.documents_count > 0 && (
              <span className="text-xs bg-gray-200 dark:bg-dark-600 px-2 py-0.5 rounded-full">
                {folder.documents_count}
              </span>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder(folder.id);
              }}
              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400"
              title="Kreiraj podfolder"
            >
              <FiFolderPlus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder.id);
              }}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
              title="Obriši folder"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>

        {hasSubfolders && isExpanded && (
          <div>
            {folder.subfolders!.map((subfolder) =>
              renderFolder(subfolder, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Folderi</h3>
        <button
          onClick={() => onCreateFolder()}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <FiFolderPlus size={16} />
          Novi Folder
        </button>
      </div>

      <div
        onClick={() => onSelectFolder(null)}
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer mb-2 ${
          selectedFolder === null
            ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
            : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-300'
        }`}
      >
        <FiFolder size={18} />
        <span className="font-medium">Svi Dokumenti</span>
      </div>

      <div className="space-y-1">
        {tree.map((folder) => renderFolder(folder))}
      </div>
    </div>
  );
}

