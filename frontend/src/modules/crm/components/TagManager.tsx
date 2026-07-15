import { useState, useEffect } from 'react';
import { FiTag, FiPlus, FiX } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TagManagerProps {
  entityType: 'account' | 'contact' | 'deal';
  entityId: number;
}

export default function TagManager({ entityType, entityId }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  useEffect(() => {
    loadTags();
    loadAvailableTags();
  }, [entityType, entityId]);

  const loadTags = async () => {
    try {
      // Get entity to load its tags
      const response = await apiService.get(`/crm/${entityType === 'account' ? 'companies' : entityType === 'contact' ? 'contacts' : 'deals'}/${entityId}`);
      setTags(response.tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const response = await apiService.get('/crm/tags?module=crm');
      setAvailableTags(response || []);
    } catch (error) {
      console.error('Failed to load available tags:', error);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error('Naziv tag-a je obavezan');
      return;
    }

    try {
      const tag = await apiService.post('/crm/tags', {
        name: newTagName,
        color: '#3B82F6',
        module: 'crm',
      });
      toast.success('Tag uspješno kreiran');
      setNewTagName('');
      setShowAddTag(false);
      await loadAvailableTags();
      // Automatski dodaj tag entitetu
      await handleAttachTag(tag.id);
    } catch (error: any) {
      console.error('Failed to create tag:', error);
      toast.error(error.response?.data?.error || 'Greška pri kreiranju tag-a');
    }
  };

  const handleAttachTag = async (tagId: number) => {
    try {
      await apiService.post(`/crm/${entityType}/${entityId}/tags`, { tag_id: tagId });
      toast.success('Tag uspješno dodan');
      loadTags();
    } catch (error: any) {
      console.error('Failed to attach tag:', error);
      toast.error(error.response?.data?.error || 'Greška pri dodavanju tag-a');
    }
  };

  const handleDetachTag = async (tagId: number) => {
    try {
      await apiService.delete(`/crm/${entityType}/${entityId}/tags/${tagId}`);
      toast.success('Tag uspješno uklonjen');
      loadTags();
    } catch (error) {
      console.error('Failed to detach tag:', error);
      toast.error('Greška pri uklanjanju tag-a');
    }
  };

  const unattachedTags = availableTags.filter(tag => !tags.some(t => t.id === tag.id));

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Učitavanje tagova...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Existing Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            <FiTag size={14} />
            {tag.name}
            <button
              onClick={() => handleDetachTag(tag.id)}
              className="ml-1 hover:bg-black/20 rounded-full p-0.5"
            >
              <FiX size={12} />
            </button>
          </span>
        ))}
      </div>

      {/* Add Tag */}
      {showAddTag ? (
        <div className="space-y-2">
          <select
            value={selectedTagId || ''}
            onChange={(e) => {
              const tagId = parseInt(e.target.value);
              if (tagId) {
                handleAttachTag(tagId);
                setSelectedTagId(null);
                setShowAddTag(false);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Odaberi postojeći tag</option>
            {unattachedTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ili kreiraj novi tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={handleCreateTag}
              className="btn-primary px-4 py-2"
            >
              Kreiraj
            </button>
            <button
              onClick={() => {
                setShowAddTag(false);
                setNewTagName('');
                setSelectedTagId(null);
              }}
              className="btn-secondary px-4 py-2"
            >
              Odustani
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddTag(true)}
          className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
        >
          <FiPlus size={16} />
          Dodaj Tag
        </button>
      )}
    </div>
  );
}






















