import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiFolder,
  FiFile,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiList,
  FiClock,
  FiFileText,
  FiImage,
  FiFilm,
  FiMusic,
  FiArchive,
  FiX,
  FiFolderPlus,
  FiMove,
  FiChevronRight,
  FiArrowLeft,
  FiPlus,
  FiMail,
  FiEye,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { sr } from 'date-fns/locale';
import VersionHistoryModal from '../components/VersionHistoryModal';
import MoveDocumentModal from '../components/MoveDocumentModal';
import SendEmailModal from '../components/SendEmailModal';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

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

interface Folder {
  id: number;
  name: string;
  parent_folder_id?: number | null;
  documents_count?: number;
  subfolders_count?: number;
  folder_path?: Array<{ id: number; name: string }>;
  breadcrumb?: string[];
  created_at?: string;
  updated_at?: string;
}

type UnifiedItem = (Folder & { isFolder: true; type: string }) | (Document & { isFolder: false; type: string });

export default function DMSOverview() {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showMoveDocumentModal, setShowMoveDocumentModal] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [showDocumentPreviewModal, setShowDocumentPreviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [parentFolderId, setParentFolderId] = useState<number | undefined>(undefined);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFolderPath, setCurrentFolderPath] = useState<Array<{ id: number; name: string }>>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type' | 'modified'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage] = useState(50); // Optimized for performance
  const [stats, setStats] = useState({
    total_documents: 0,
    total_size: 0,
    recent_uploads: 0,
  });

  useEffect(() => {
    // Optimize: Fetch documents and folders in parallel
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch both in parallel for better performance
        await Promise.all([
          fetchDocuments(),
          fetchFolders()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Fetch stats separately (non-blocking)
    if (!searchQuery) {
      fetchStats();
    }
  }, [selectedFolder, searchQuery, sortBy, sortOrder, currentPage]);

  const fetchDocuments = async () => {
    try {
      const params: any = {
        page: currentPage,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (selectedFolder !== null) params.folder_id = selectedFolder;
      if (searchQuery) params.search = searchQuery;
      
      const data = await apiService.get('/dms/documents', params);
      setDocuments(data.data || []);
      setTotalPages(data.last_page || 1);
      setTotalItems(data.total || 0);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Greška pri učitavanju dokumenata');
      setDocuments([]);
    }
  };

  const handleSort = (column: 'name' | 'size' | 'date' | 'type' | 'modified') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const fetchFolders = async () => {
    try {
      const params: any = {};
      // Windows Explorer style - only fetch direct children of selected folder
      if (selectedFolder !== null) {
        params.parent_id = selectedFolder;
      } else {
        params.parent_id = 0; // Root level
      }
      
      const data = await apiService.get('/dms/folders', params);
      setFolders(data || []);
      
      // Get current folder info if selected (non-blocking, load in background)
      if (selectedFolder !== null) {
        // Fetch current folder info with path asynchronously (don't block main render)
        apiService.get('/dms/folders', { folder_id: selectedFolder })
          .then((folderData) => {
            if (folderData && folderData.folder_path) {
              // folder_path includes the current folder, so we need to remove it for breadcrumb
              const pathWithoutCurrent = folderData.folder_path.slice(0, -1);
              setCurrentFolderPath(pathWithoutCurrent);
              setCurrentFolder({
                id: folderData.id,
                name: folderData.name,
                parent_folder_id: folderData.parent_folder_id,
                documents_count: folderData.documents_count,
                subfolders_count: folderData.subfolders_count,
              } as Folder);
            } else {
              // Fallback
              setCurrentFolderPath([]);
              setCurrentFolder({ id: selectedFolder, name: 'Folder', parent_folder_id: null } as Folder);
            }
          })
          .catch((error) => {
            console.error('Error fetching current folder:', error);
            setCurrentFolderPath([]);
            setCurrentFolder({ id: selectedFolder, name: 'Folder', parent_folder_id: null } as Folder);
          });
      } else {
        setCurrentFolderPath([]);
        setCurrentFolder(null);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiService.get('/dms/stats');
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append('file', files[0]);
    if (selectedFolder) formData.append('folder_id', selectedFolder.toString());

    try {
      await apiService.upload('/dms/documents/upload', formData, (progress) => {
        setUploadProgress(progress);
      });
      toast.success('Dokument uspješno otpremljen');
      setShowUploadModal(false);
      setUploadProgress(0);
      fetchDocuments();
      fetchStats();
    } catch (error) {
      toast.error('Greška pri otpremanju dokumenta');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await apiService.download(`/dms/documents/${doc.id}/download`, doc.original_name);
      toast.success('Preuzimanje započeto');
    } catch (error) {
      toast.error('Greška pri preuzimanju');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj dokument?')) return;

    try {
      await apiService.delete(`/dms/documents/${id}`);
      toast.success('Dokument obrisan');
      fetchDocuments();
      fetchStats();
    } catch (error) {
      toast.error('Greška pri brisanju');
    }
  };

  const handleCreateFolder = async (name: string, permissions?: Array<{
    user_id?: number;
    role_id?: number;
    can_view: boolean;
    can_create: boolean;
    can_delete: boolean;
  }>) => {
    try {
      // Use selectedFolder if parentFolderId is not explicitly set
      const actualParentId = parentFolderId !== undefined ? parentFolderId : (selectedFolder !== null ? selectedFolder : null);
      console.log('Creating folder:', name, 'Parent (from state):', parentFolderId, 'Parent (from selectedFolder):', selectedFolder, 'Actual Parent:', actualParentId);
      const result = await apiService.post('/dms/folders', { 
        name,
        parent_folder_id: actualParentId,
        permissions: permissions || []
      });
      console.log('Folder created:', result);
      toast.success('Folder kreiran');
      setShowCreateFolderModal(false);
      setParentFolderId(undefined);
      fetchFolders();
    } catch (error: any) {
      console.error('Error creating folder:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors || 'Greška pri kreiranju foldera';
      toast.error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj folder?')) return;

    try {
      await apiService.delete(`/dms/folders/${folderId}`);
      toast.success('Folder obrisan');
      fetchFolders();
      fetchDocuments();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Greška pri brisanju foldera';
      toast.error(errorMessage);
    }
  };

  const handleMoveDocument = async (folderId: number | null) => {
    if (!selectedDocument) return;

    try {
      await apiService.put(`/dms/documents/${selectedDocument.id}/move`, {
        folder_id: folderId,
      });
      toast.success('Dokument premješten');
      setShowMoveDocumentModal(false);
      setSelectedDocument(null);
      fetchDocuments();
    } catch (error) {
      toast.error('Greška pri premještanju dokumenta');
    }
  };

  const openMoveModal = (doc: Document) => {
    setSelectedDocument(doc);
    setShowMoveDocumentModal(true);
  };

  const openVersionHistory = (doc: Document) => {
    setSelectedDocument(doc);
    setShowVersionHistoryModal(true);
  };

  const openSendEmailModal = (doc: Document) => {
    setSelectedDocument(doc);
    setShowSendEmailModal(true);
  };

  const openDocumentPreview = (doc: Document) => {
    setSelectedDocument(doc);
    setShowDocumentPreviewModal(true);
  };

  const openCreateFolderModal = (parentId?: number) => {
    setParentFolderId(parentId);
    setShowCreateFolderModal(true);
  };

  const getFileIcon = (mimeType: string, size: number = 20) => {
    if (mimeType.startsWith('image/')) return <FiImage className="text-blue-500" size={size} />;
    if (mimeType.startsWith('video/')) return <FiFilm className="text-purple-500" size={size} />;
    if (mimeType.startsWith('audio/')) return <FiMusic className="text-pink-500" size={size} />;
    if (mimeType.includes('pdf')) return <FiFileText className="text-red-500" size={size} />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FiArchive className="text-yellow-500" size={size} />;
    return <FiFile className="text-gray-500" size={size} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Combine folders and documents for unified list view
  const allItems: UnifiedItem[] = [
    ...folders.map(f => ({ ...f, isFolder: true as const, type: 'File folder' })),
    ...documents.map(d => ({ ...d, isFolder: false as const, type: d.mime_type || 'File' }))
  ].sort((a, b) => {
    // Folders first, then files
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    
    // Then sort by selected sort column
    switch (sortBy) {
      case 'name':
        const nameA = a.isFolder ? (a.name || '') : (a.original_name || '');
        const nameB = b.isFolder ? (b.name || '') : (b.original_name || '');
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      case 'date':
        const dateA = new Date(a.isFolder ? (a.created_at || '') : (a.updated_at || a.created_at || ''));
        const dateB = new Date(b.isFolder ? (b.created_at || '') : (b.updated_at || b.created_at || ''));
        return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      case 'type':
        return sortOrder === 'asc' 
          ? (a.type || '').localeCompare(b.type || '')
          : (b.type || '').localeCompare(a.type || '');
      case 'size':
        const sizeA = a.isFolder ? 0 : (a.size || 0);
        const sizeB = b.isFolder ? 0 : (b.size || 0);
        return sortOrder === 'asc' ? sizeA - sizeB : sizeB - sizeA;
      default:
        return 0;
    }
  });

  const formatItemDate = (item: UnifiedItem) => {
    const dateStr = item.isFolder ? item.created_at : (item.updated_at || item.created_at);
    return new Date(dateStr || '').toLocaleDateString('sr-RS', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleItemOpen = (item: UnifiedItem) => {
    if (item.isFolder) {
      setSelectedFolder(item.id);
    } else {
      openDocumentPreview(item);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      {/* Compact Header + Toolbar Combined */}
      <div className="shrink-0 border-b border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-800">
        <div className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Back Button */}
            {selectedFolder !== null && (
              <button
                onClick={() => {
                  if (currentFolder?.parent_folder_id) {
                    setSelectedFolder(currentFolder.parent_folder_id);
                  } else {
                    setSelectedFolder(null);
                  }
                }}
                className="shrink-0 rounded p-1.5 hover:bg-gray-100 dark:hover:bg-dark-700 touch-manipulation"
                title="Nazad"
              >
                <FiArrowLeft size={16} />
              </button>
            )}

            {/* Breadcrumb */}
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`shrink-0 rounded px-2 py-1 text-xs whitespace-nowrap touch-manipulation ${
                  selectedFolder === null
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-700'
                }`}
              >
                Dokumenti
              </button>
              {currentFolderPath.map((pathItem) => (
                <div key={pathItem.id} className="flex shrink-0 items-center gap-1">
                  <FiChevronRight size={12} className="shrink-0 text-gray-400" />
                  <button
                    onClick={() => setSelectedFolder(pathItem.id)}
                    className="rounded px-2 py-1 text-xs whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-700 touch-manipulation"
                  >
                    {pathItem.name}
                  </button>
                </div>
              ))}
              {selectedFolder !== null && currentFolder && (
                <>
                  <FiChevronRight size={12} className="shrink-0 text-gray-400" />
                  <span className="shrink-0 px-2 py-1 text-xs font-medium whitespace-nowrap text-primary-600 dark:text-primary-400">
                    {currentFolder.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="text"
              placeholder="Pretraži..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input h-8 min-w-0 flex-1 text-xs sm:w-48 sm:flex-none"
            />
            <button
              onClick={() => openCreateFolderModal(selectedFolder || undefined)}
              className="btn-secondary flex h-8 shrink-0 items-center gap-1.5 px-2 text-xs touch-manipulation"
              title="Novi Folder"
            >
              <FiFolderPlus size={14} />
              <span className="hidden sm:inline">Novi Folder</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex h-8 shrink-0 items-center gap-1.5 px-3 text-xs touch-manipulation"
            >
              <FiUpload size={14} />
              <span className="sm:hidden">Dodaj</span>
              <span className="hidden sm:inline">Upload</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area - List View with Folders and Files Combined */}
      <div className="flex-1 overflow-hidden min-h-0 bg-white dark:bg-dark-800">

            {/* Unified List View with Folders and Files */}
            {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">Učitavanje...</p>
          </div>
        </div>
      ) : allItems.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FiFile className="mx-auto text-gray-400 mb-2" size={32} />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Nema dokumenata
            </h3>
            <button onClick={() => setShowUploadModal(true)} className="btn-primary text-xs mt-2">
              <FiUpload className="inline mr-1" size={14} />
              Upload Dokument
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-w-0 flex-col bg-white dark:bg-dark-800">
          {/* Mobile cards */}
          <div className="flex-1 space-y-2 overflow-auto p-3 md:hidden">
            {allItems.map((item) => (
              <div
                key={item.isFolder ? `folder-${item.id}` : `doc-${item.id}`}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-800"
              >
                <button
                  type="button"
                  onClick={() => handleItemOpen(item)}
                  className="flex w-full min-w-0 items-start gap-3 text-left touch-manipulation"
                >
                  <div className="shrink-0 pt-0.5">
                    {item.isFolder ? (
                      <FiFolder className="text-blue-500" size={22} />
                    ) : (
                      getFileIcon(item.mime_type, 22)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm text-gray-900 dark:text-white">
                      {item.isFolder ? item.name : (item as Document).original_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatItemDate(item)}
                      {!item.isFolder && ` · ${formatFileSize(item.size)}`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                      {item.isFolder ? 'Folder' : item.type}
                    </p>
                  </div>
                </button>
                <div className="mt-2 flex flex-wrap justify-end gap-1 border-t border-gray-100 pt-2 dark:border-dark-600">
                  {item.isFolder ? (
                    <button
                      onClick={() => handleDeleteFolder(item.id)}
                      className="rounded p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 touch-manipulation"
                      title="Obriši folder"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => openDocumentPreview(item)}
                        className="rounded p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 touch-manipulation"
                        title="Pregled"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(item as Document)}
                        className="rounded p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-700 touch-manipulation"
                        title="Preuzmi"
                      >
                        <FiDownload size={16} />
                      </button>
                      <button
                        onClick={() => openVersionHistory(item)}
                        className="rounded p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 touch-manipulation"
                        title="Verzije"
                      >
                        <FiClock size={16} />
                      </button>
                      <button
                        onClick={() => openMoveModal(item)}
                        className="rounded p-2 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 touch-manipulation"
                        title="Premjesti"
                      >
                        <FiMove size={16} />
                      </button>
                      <button
                        onClick={() => openSendEmailModal(item)}
                        className="rounded p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 touch-manipulation"
                        title="Pošalji mailom"
                      >
                        <FiMail size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 touch-manipulation"
                        title="Obriši"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Windows Explorer Style List View - desktop */}
          <div className="hidden min-h-0 flex-1 overflow-auto md:block">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '15%', minWidth: '120px' }} />
              </colgroup>
              <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600 sticky top-0 z-10">
                <tr>
                  <th 
                    className="px-3 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Name</span>
                      {sortBy === 'name' && (
                        <span className="text-primary-600 dark:text-primary-400 text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-3 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date modified</span>
                      {sortBy === 'date' && (
                        <span className="text-primary-600 dark:text-primary-400 text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-3 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 select-none"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Type</span>
                      {sortBy === 'type' && (
                        <span className="text-primary-600 dark:text-primary-400 text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-3 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 select-none"
                    onClick={() => handleSort('size')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Size</span>
                      {sortBy === 'size' && (
                        <span className="text-primary-600 dark:text-primary-400 text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-3 py-1.5 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{width: '128px', minWidth: '128px'}}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-600">
                {allItems.map((item) => (
                  <tr 
                    key={item.isFolder ? `folder-${item.id}` : `doc-${item.id}`} 
                    className="hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
                    onDoubleClick={() => {
                      if (item.isFolder) {
                        setSelectedFolder(item.id);
                      } else {
                        handleDownload(item);
                      }
                    }}
                  >
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                          {item.isFolder ? (
                            <FiFolder className="text-blue-500" size={20} />
                          ) : (
                            getFileIcon(item.mime_type, 20)
                          )}
                        </div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate min-w-0" title={item.isFolder ? item.name : (item as Document).original_name}>
                          {item.isFolder ? item.name : (item as Document).original_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.isFolder 
                        ? new Date(item.created_at || '').toLocaleDateString('sr-RS', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date(item.updated_at || item.created_at).toLocaleDateString('sr-RS', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                      }
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap truncate max-w-xs" title={item.type}>
                      {item.type}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.isFolder ? '-' : formatFileSize(item.size)}
                    </td>
                    <td className="px-3 py-1.5 text-right" style={{width: '128px', minWidth: '128px'}}>
                      <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        {item.isFolder ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(item.id);
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                              title="Obriši folder"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!item.isFolder) openDocumentPreview(item);
                              }}
                              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded text-indigo-600 dark:text-indigo-400"
                              title="Pregled"
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(item as Document);
                              }}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-dark-700 rounded text-gray-600 dark:text-gray-400"
                              title="Preuzmi"
                            >
                              <FiDownload size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!item.isFolder) openVersionHistory(item);
                              }}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400"
                              title="Verzije"
                            >
                              <FiClock size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!item.isFolder) openMoveModal(item);
                              }}
                              className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded text-purple-600 dark:text-purple-400"
                              title="Premjesti"
                            >
                              <FiMove size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!item.isFolder) openSendEmailModal(item);
                              }}
                              className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded text-green-600 dark:text-green-400"
                              title="Pošalji mailom"
                            >
                              <FiMail size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!item.isFolder) handleDelete(item.id);
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                              title="Obriši"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          progress={uploadProgress}
        />
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <CreateFolderModal
          onClose={() => {
            setShowCreateFolderModal(false);
            setParentFolderId(undefined);
          }}
          onCreate={handleCreateFolder}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && selectedDocument && (
        <VersionHistoryModal
          documentId={selectedDocument.id}
          documentName={selectedDocument.original_name}
          onClose={() => {
            setShowVersionHistoryModal(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {/* Move Document Modal */}
      {showMoveDocumentModal && selectedDocument && (
        <MoveDocumentModal
          folders={folders}
          currentFolderId={selectedDocument.folder_id || null}
          onClose={() => {
            setShowMoveDocumentModal(false);
            setSelectedDocument(null);
          }}
          onMove={handleMoveDocument}
        />
      )}

      {/* Send Email Modal */}
      {showSendEmailModal && selectedDocument && (
        <SendEmailModal
          document={selectedDocument}
          onClose={() => {
            setShowSendEmailModal(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {/* Document Preview Modal */}
      {showDocumentPreviewModal && selectedDocument && (
        <DocumentPreviewModal
          document={selectedDocument}
          onClose={() => {
            setShowDocumentPreviewModal(false);
            setSelectedDocument(null);
          }}
          onDownload={handleDownload}
          onMove={openMoveModal}
          onVersionHistory={openVersionHistory}
          onDelete={handleDelete}
          onSendEmail={openSendEmailModal}
        />
      )}
    </div>
  );
}

// Upload Modal Component
function UploadModal({
  onClose,
  onUpload,
  progress,
}: {
  onClose: () => void;
  onUpload: (files: FileList | null) => void;
  progress: number;
}) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-600 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Upload Dokument</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <FiX size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/10'
                : 'border-gray-300 dark:border-dark-600'
            }`}
          >
            <FiUpload className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-900 dark:text-white font-medium mb-2">
              Prevucite fajl ovde ili kliknite da izaberete
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Maksimalna veličina: 50MB
            </p>
            <input
              type="file"
              onChange={(e) => onUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="btn-primary cursor-pointer inline-block">
              Izaberi Fajl
            </label>
          </div>

          {progress > 0 && progress < 100 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Otpremanje...</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Create Folder Modal Component
function CreateFolderModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, permissions?: Array<{
    user_id?: number;
    role_id?: number;
    can_view: boolean;
    can_create: boolean;
    can_delete: boolean;
  }>) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: number; name: string; display_name: string }>>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Map<number, {
    type: 'user' | 'role';
    can_view: boolean;
    can_create: boolean;
    can_delete: boolean;
  }>>(new Map());

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    setLoadingData(true);
    try {
      const data = await apiService.get<{ users: Array<{ id: number; name: string; email: string }>; roles: Array<{ id: number; name: string; display_name: string }> }>('/dms/folders/users-roles');
      setUsers(data.users || []);
      setRoles(data.roles || []);
    } catch (error: any) {
      console.error('Error fetching users and roles:', error);
      toast.error('Greška pri učitavanju korisnika i uloga');
    } finally {
      setLoadingData(false);
    }
  };

  const handlePermissionToggle = (id: number, type: 'user' | 'role', permission: 'can_view' | 'can_create' | 'can_delete') => {
    setSelectedPermissions((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(id) || { type, can_view: false, can_create: false, can_delete: false };
      
      if (!newMap.has(id)) {
        newMap.set(id, { ...current, type });
      }
      
      const updated = { ...newMap.get(id)! };
      updated[permission] = !updated[permission];
      
      // If no permissions are selected, remove from map
      if (!updated.can_view && !updated.can_create && !updated.can_delete) {
        newMap.delete(id);
      } else {
        newMap.set(id, updated);
      }
      
      return newMap;
    });
  };

  const handleItemToggle = (id: number, type: 'user' | 'role') => {
    setSelectedPermissions((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(id)) {
        newMap.delete(id);
      } else {
        newMap.set(id, { type, can_view: true, can_create: false, can_delete: false });
      }
      return newMap;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      // Convert permissions map to array format
      const permissions: Array<{
        user_id?: number;
        role_id?: number;
        can_view: boolean;
        can_create: boolean;
        can_delete: boolean;
      }> = [];

      selectedPermissions.forEach((perm, id) => {
        if (perm.type === 'user') {
          permissions.push({
            user_id: id,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_delete: perm.can_delete,
          });
        } else {
          permissions.push({
            role_id: id,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_delete: perm.can_delete,
          });
        }
      });

      await onCreate(name.trim(), permissions);
      setName('');
      setSelectedPermissions(new Map());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-dark-600 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Novi Folder</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Naziv Foldera <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Unesite naziv foldera"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Roles Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiFolder className="inline mr-1" />
              Uloge - Ovlaštenja za folder
            </label>
            {loadingData ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Učitavanje uloga...</div>
            ) : (
              <div className="border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 p-3 max-h-60 overflow-y-auto">
                {roles.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih uloga</div>
                ) : (
                  roles.map((role) => {
                    const perm = selectedPermissions.get(role.id);
                    const isSelected = perm?.type === 'role';

                    return (
                      <div key={role.id} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0 border-gray-200 dark:border-dark-600">
                        <label className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-600 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleItemToggle(role.id, 'role')}
                            disabled={loading}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {role.display_name || role.name}
                          </span>
                        </label>
                        
                        {isSelected && (
                          <div className="ml-6 mt-2 space-y-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={perm!.can_view}
                                onChange={() => handlePermissionToggle(role.id, 'role', 'can_view')}
                                disabled={loading}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Pregled</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={perm!.can_create}
                                onChange={() => handlePermissionToggle(role.id, 'role', 'can_create')}
                                disabled={loading}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Kreiranje</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={perm!.can_delete}
                                onChange={() => handlePermissionToggle(role.id, 'role', 'can_delete')}
                                disabled={loading}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Brisanje</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Users Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiFolder className="inline mr-1" />
              Korisnici - Ovlaštenja za folder
            </label>
            {loadingData ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Učitavanje korisnika...</div>
            ) : (
              <div className="border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 p-3 max-h-60 overflow-y-auto">
                {users.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih korisnika</div>
                ) : (
                  users.map((user) => {
                    const perm = selectedPermissions.get(user.id);
                    const isSelected = perm?.type === 'user';

                    return (
                      <div key={user.id} className="mb-3 last:mb-0 pb-3 last:pb-0 border-b last:border-b-0 border-gray-200 dark:border-dark-600">
                        <label className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-600 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleItemToggle(user.id, 'user')}
                            disabled={loading}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name} ({user.email})
                          </span>
                        </label>
                        
                        {isSelected && (
                          <div className="ml-6 mt-2 space-y-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={perm!.can_view}
                                onChange={() => handlePermissionToggle(user.id, 'user', 'can_view')}
                                disabled={loading}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Pregled</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={perm!.can_create}
                                onChange={() => handlePermissionToggle(user.id, 'user', 'can_create')}
                                disabled={loading}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Kreiranje</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={perm!.can_delete}
                                onChange={() => handlePermissionToggle(user.id, 'user', 'can_delete')}
                                disabled={loading}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Brisanje</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-gray-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-800 sm:flex-row sm:p-6">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              <FiPlus className="inline mr-2" />
              {loading ? 'Kreiranje...' : 'Kreiraj Folder'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Otkaži
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
