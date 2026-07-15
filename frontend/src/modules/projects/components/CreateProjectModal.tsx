import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiFlag, FiUsers, FiShield } from 'react-icons/fi';
import { projectsService, Project } from '@/services/projectsService';
import toast from 'react-hot-toast';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (project: Project) => void;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Role {
  id: number;
  name: string;
  display_name: string;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'medium',
  });

  // Fetch users and roles when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsersAndRoles();
    }
  }, [isOpen]);

  const fetchUsersAndRoles = async () => {
    setLoadingData(true);
    try {
      const data = await projectsService.getUsersAndRoles();
      setUsers(data.users || []);
      setRoles(data.roles || []);
    } catch (error: any) {
      console.error('Error fetching users and roles:', error);
      toast.error('Greška pri učitavanju korisnika i uloga');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Naziv projekta je obavezan');
      return;
    }

    try {
      setLoading(true);
      const project = await projectsService.createProject({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        role_ids: selectedRoleIds.length > 0 ? selectedRoleIds : undefined,
        user_ids: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      });
      
      toast.success('Projekt uspješno kreiran');
      onClose();
      
      if (onProjectCreated) {
        onProjectCreated(project);
      } else {
        // Navigate to the new project
        navigate(`/projects/${project.id}`);
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.response?.data?.message || 'Greška pri kreiranju projekta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        description: '',
        status: 'planning',
        priority: 'medium',
      });
      setSelectedRoleIds([]);
      setSelectedUserIds([]);
      onClose();
    }
  };

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Kreiraj novi projekt</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Naziv projekta <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Naziv projekta..."
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Opis projekta..."
              disabled={loading}
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="planning">Planiranje</option>
                <option value="active">Aktivan</option>
                <option value="on-hold">Na čekanju</option>
                <option value="completed">Završen</option>
                <option value="cancelled">Otkazan</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prioritet
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="low">Nizak</option>
                <option value="medium">Srednji</option>
                <option value="high">Visok</option>
                <option value="urgent">Hitno</option>
              </select>
            </div>
          </div>

          {/* Roles Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiShield className="inline mr-1" />
              Uloge koje mogu vidjeti i ažurirati projekt
            </label>
            {loadingData ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Učitavanje uloga...</div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 p-2">
                {roles.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih uloga</div>
                ) : (
                  roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        disabled={loading}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {role.display_name || role.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Users Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiUsers className="inline mr-1" />
              Pojedinačni korisnici koji mogu vidjeti i ažurirati projekt
            </label>
            {loadingData ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Učitavanje korisnika...</div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 p-2">
                {users.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2">Nema dostupnih korisnika</div>
                ) : (
                  users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        disabled={loading}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.name} ({user.email})
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm sm:text-base text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors disabled:opacity-50"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Kreiranje...
                </>
              ) : (
                <>
                  <FiFlag size={18} />
                  Kreiraj projekt
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}







