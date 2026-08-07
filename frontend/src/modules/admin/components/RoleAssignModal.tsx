import { useState, useEffect } from 'react';
import { FiX, FiShield, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';

interface RoleAssignModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

function getPrimaryRoleName(user: any): string {
  const roles = user?.roles;
  if (!roles || !Array.isArray(roles) || roles.length === 0) return '';
  const first = roles[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && typeof first.name === 'string') return first.name;
  return '';
}

export default function RoleAssignModal({ user, onClose, onSuccess }: RoleAssignModalProps) {
  const [selectedRole, setSelectedRole] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingRoles(true);
      try {
        const data = await apiService.get<any[]>('/admin/roles');
        if (cancelled) return;
        setRoles(Array.isArray(data) ? data : []);
        setSelectedRole(getPrimaryRoleName(user));
      } catch {
        if (!cancelled) {
          toast.error('Greška pri učitavanju uloga');
          setSelectedRole(getPrimaryRoleName(user));
        }
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast.error('Molimo izaberite ulogu');
      return;
    }

    setLoading(true);

    try {
      await apiService.post(`/admin/users/${user.id}/assign-role`, {
        role: selectedRole,
      });

      toast.success('Uloga uspješno dodjeljena');
      onSuccess();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.role?.[0] ||
        'Greška pri dodjeli uloge';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-600">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-primary-600 dark:text-primary-400" />
            Dodjeli ulogu
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Korisnik</div>
            <div className="font-semibold text-gray-900 dark:text-white">{user.name}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
            {getPrimaryRoleName(user) && (
              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Trenutna uloga: <span className="font-semibold">{getPrimaryRoleName(user)}</span>
              </div>
            )}
          </div>

          <div>
            <label className="label">Izaberite ulogu *</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input"
              required
              disabled={loadingRoles}
            >
              <option value="">{loadingRoles ? 'Učitavanje...' : '-- Izaberite ulogu --'}</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                  {role.users_count ? ` (${role.users_count} korisnika)` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedRole && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                Dozvole uloge:
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-400">
                {roles
                  .find((r) => r.name === selectedRole)
                  ?.permissions?.map((p: any) => p.name)
                  .join(', ') || 'Nema dodjeljenih dozvola'}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || loadingRoles || !selectedRole}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <FiSave size={18} />
              {loading ? 'Dodjela...' : 'Dodjeli ulogu'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Otkaži
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
