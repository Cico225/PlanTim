import { useState, useEffect } from 'react';
import { FiX, FiShield, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import ModulePermissionsTree, { type ModulePermission } from './ModulePermissionsTree';

interface RoleModalProps {
  role: any | null;
  permissions?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

function emptyFromModules(modules: any[]): ModulePermission[] {
  return (modules || []).map((module) => {
    let available: string[] = [];
    try {
      if (Array.isArray(module.available_permissions)) {
        available = module.available_permissions;
      } else if (typeof module.available_permissions === 'string') {
        available = JSON.parse(module.available_permissions || '[]');
      }
    } catch {
      available = [];
    }

    return {
      module_name: module.name,
      parent_name: module.parent_name ?? null,
      display_name: module.display_name,
      icon: module.icon,
      is_plugin: !!module.is_plugin,
      available_permissions: available,
      can_view: false,
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
      can_export: false,
      can_import: false,
      custom_permissions: null,
    };
  });
}

export default function RoleModal({ role, onClose, onSuccess }: RoleModalProps) {
  const [formData, setFormData] = useState({ name: '' });
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingPermissions(true);
      try {
        setFormData({ name: role?.name || '' });

        if (role?.id) {
          const data = await apiService.get<ModulePermission[]>(
            `/admin/roles/${role.id}/module-permissions`
          );
          if (!cancelled) {
            setModulePermissions(Array.isArray(data) ? data : []);
          }
        } else {
          const modules = await apiService.get<any[]>('/admin/modules');
          if (!cancelled) {
            const active = (Array.isArray(modules) ? modules : []).filter(
              (m) => m.is_active !== false
            );
            setModulePermissions(emptyFromModules(active));
          }
        }
      } catch (error) {
        console.error('Error loading role module permissions:', error);
        if (!cancelled) {
          toast.error('Greška pri učitavanju dozvola modula');
          setModulePermissions([]);
        }
      } finally {
        if (!cancelled) setLoadingPermissions(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        module_permissions: modulePermissions,
      };

      if (role) {
        if (role.is_system && role.name !== formData.name) {
          toast.error('Ne možete promeniti ime sistem uloge. Sistem uloge su zaštićene.');
          setLoading(false);
          return;
        }

        await apiService.put(`/admin/roles/${role.id}`, payload);
        toast.success('Uloga uspješno ažurirana');
      } else {
        await apiService.post('/admin/roles', payload);
        toast.success('Uloga uspješno kreirana');
      }
      onSuccess();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.name?.[0] ||
        error.response?.data?.errors?.['module_permissions.0.module_name']?.[0] ||
        'Greška pri čuvanju uloge';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const enabledCount = modulePermissions.filter((p) => p.can_view).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-purple-600 dark:text-purple-400" />
            {role ? 'Izmeni ulogu — ovlaštenja modula' : 'Nova uloga — ovlaštenja modula'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
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
                Sistem uloga — ime ne može biti promijenjeno
              </p>
            )}
          </div>

          <div>
            <label className="label">Ovlaštenja po modulima</label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Ista ovlaštenja kao u Administracija → Moduli (pregled, kreiranje, izmjena…).
              Korisnici sa ovom ulogom automatski dobijaju označena ovlaštenja.
            </p>

            {loadingPermissions ? (
              <div className="border border-gray-200 dark:border-dark-600 rounded-lg p-8 text-center text-gray-500">
                Učitavanje dozvola…
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-dark-600 rounded-lg p-3 max-h-[50vh] overflow-y-auto">
                <ModulePermissionsTree
                  permissions={modulePermissions}
                  onChange={setModulePermissions}
                />
              </div>
            )}

            {!loadingPermissions && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Omogućeno modula: {enabledCount} / {modulePermissions.length}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-dark-600 sticky bottom-0 bg-white dark:bg-dark-800 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-0">
            <button
              type="submit"
              disabled={loading || loadingPermissions || !formData.name.trim()}
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
