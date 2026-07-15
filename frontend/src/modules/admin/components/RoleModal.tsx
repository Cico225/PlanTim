import { useState, useEffect } from 'react';
import { FiX, FiShield, FiSave, FiLock, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';

interface RoleModalProps {
  role: any | null;
  permissions: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function RoleModal({ role, permissions, onClose, onSuccess }: RoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        permissions: role.permissions?.map((p: any) => p.name) || [],
      });
    } else {
      setFormData({
        name: '',
        permissions: [],
      });
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role) {
        // Check if trying to change system role name
        if (role.is_system && role.name !== formData.name) {
          toast.error('Ne možete promeniti ime sistem uloge. Sistem uloge su zaštićene.');
          setLoading(false);
          return;
        }

        // Update role
        await apiService.put(`/admin/roles/${role.id}`, {
          name: formData.name,
          permissions: formData.permissions,
        });
        toast.success('Uloga uspješno ažurirana');
      } else {
        // Create role
        await apiService.post('/admin/roles', {
          name: formData.name,
          permissions: formData.permissions,
        });
        toast.success('Uloga uspješno kreirana');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.name?.[0] ||
                          'Greška pri čuvanju uloge';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permissionName: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionName)
        ? prev.permissions.filter(p => p !== permissionName)
        : [...prev.permissions, permissionName],
    }));
  };

  // Group permissions by module
  const groupedPermissions: Record<string, any[]> = {};
  permissions.forEach(permission => {
    const module = permission.module || 'general';
    if (!groupedPermissions[module]) {
      groupedPermissions[module] = [];
    }
    groupedPermissions[module].push(permission);
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-purple-600 dark:text-purple-400" />
            {role ? 'Izmeni Ulogu' : 'Nova Uloga'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Role Name */}
          <div>
            <label className="label">
              <FiShield className="inline mr-2" />
              Ime Uloge *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="npr. Manager, Editor, Viewer..."
              className="input"
              required
              disabled={loading || (role?.is_system ?? false)}
            />
            {role?.is_system && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ⚠️ Sistem uloga - ime ne može biti promenjeno
              </p>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="label">
              <FiLock className="inline mr-2" />
              Dozvole
            </label>
            <div className="mt-2 space-y-4 max-h-[400px] overflow-y-auto border border-gray-200 dark:border-dark-600 rounded-lg p-4">
              {Object.keys(groupedPermissions).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Nema dostupnih dozvola
                </p>
              ) : (
                Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                  <div key={module} className="border-b border-gray-200 dark:border-dark-600 pb-4 last:border-0 last:pb-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2 capitalize">
                      {module}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modulePermissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.name)}
                            onChange={() => togglePermission(permission.name)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            disabled={loading}
                          />
                          <span className="text-sm text-gray-900 dark:text-white flex-1">
                            {permission.name}
                          </span>
                          {formData.permissions.includes(permission.name) && (
                            <FiCheck className="text-green-500" size={16} />
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            {formData.permissions.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Izabrano: {formData.permissions.length} dozvola
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-dark-600 sticky bottom-0 bg-white dark:bg-dark-800 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-0">
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <FiSave size={18} />
              {loading ? 'Čuvanje...' : role ? 'Ažuriraj Ulogu' : 'Kreiraj Ulogu'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Otkaži
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}











