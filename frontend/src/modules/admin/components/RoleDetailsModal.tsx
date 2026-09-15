import { useEffect, useState } from 'react';
import { FiX, FiShield, FiUsers, FiLock, FiCalendar } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import ModulePermissionsTree, { type ModulePermission } from './ModulePermissionsTree';

interface RoleDetailsModalProps {
  role: any;
  onClose: () => void;
}

export default function RoleDetailsModal({ role, onClose }: RoleDetailsModalProps) {
  const [roleDetails, setRoleDetails] = useState<any>(role);
  const [modulePermissions, setModulePermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoleDetails();
  }, [role]);

  const fetchRoleDetails = async () => {
    setLoading(true);
    try {
      const [roles, modPerms] = await Promise.all([
        apiService.get<any[]>('/admin/roles'),
        apiService.get<ModulePermission[]>(`/admin/roles/${role.id}/module-permissions`),
      ]);

      const fullRole = Array.isArray(roles)
        ? roles.find((r: any) => r.id === role.id)
        : null;
      if (fullRole) {
        setRoleDetails(fullRole);
      }
      setModulePermissions(Array.isArray(modPerms) ? modPerms : []);
    } catch (error) {
      console.error('Error fetching role details:', error);
      toast.error('Greška pri učitavanju detalja uloge');
    } finally {
      setLoading(false);
    }
  };

  const enabledModules = modulePermissions.filter((p) => p.can_view);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-purple-600 dark:text-purple-400" />
            Detalji Uloge
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Učitavanje...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Informacije o Ulozi
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ime Uloge</div>
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiShield className="text-purple-600" size={16} />
                        {roleDetails?.name || '-'}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Guard</div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {roleDetails?.guard_name || '-'}
                      </div>
                    </div>

                    {roleDetails?.users_count !== undefined && (
                      <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Korisnici</div>
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <FiUsers className="text-blue-600" size={16} />
                          {roleDetails.users_count} korisnika
                        </div>
                      </div>
                    )}

                    {roleDetails?.created_at && (
                      <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Kreirana</div>
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <FiCalendar className="text-green-600" size={16} />
                          {new Date(roleDetails.created_at).toLocaleDateString('sr-RS', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiLock className="text-primary-600" size={20} />
                    Ovlaštenja modula ({enabledModules.length})
                  </h3>
                  {enabledModules.length > 0 ? (
                    <div className="border border-gray-200 dark:border-dark-600 rounded-lg p-3 max-h-[50vh] overflow-y-auto opacity-95 pointer-events-none">
                      <ModulePermissionsTree
                        permissions={modulePermissions}
                        onChange={() => {}}
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-gray-200 dark:border-dark-600 rounded-lg">
                      <FiLock className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-gray-600 dark:text-gray-400">
                        Ova uloga nema dodijeljenih ovlaštenja za module.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-dark-600">
                <button onClick={onClose} className="btn-secondary">
                  Zatvori
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
