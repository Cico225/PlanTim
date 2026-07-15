import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FiShield,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiUsers,
  FiRefreshCw,
  FiLock,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import RoleModal from '../components/RoleModal';
import RoleDetailsModal from '../components/RoleDetailsModal';

interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions?: Permission[];
  users_count?: number;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Permission {
  id: number;
  name: string;
  guard_name: string;
  module?: string;
}

export default function RolesManagement() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    withPermissions: 0,
    assignedToUsers: 0,
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<Role[]>('/admin/roles');
      setRoles(data);
      
      // Calculate stats
      setStats({
        total: data.length,
        withPermissions: data.filter(r => r.permissions && r.permissions.length > 0).length,
        assignedToUsers: data.filter(r => r.users_count && r.users_count > 0).length,
      });
    } catch (error: any) {
      toast.error('Greška pri učitavanju uloga');
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const data = await apiService.get('/admin/permissions');
      // Permissions are grouped by module, flatten them
      const allPermissions: Permission[] = [];
      Object.values(data).forEach((modulePerms: any) => {
        if (Array.isArray(modulePerms)) {
          allPermissions.push(...modulePerms);
        }
      });
      setPermissions(allPermissions);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast.error('Greška pri učitavanju dozvola');
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setShowRoleModal(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowRoleModal(true);
  };

  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    setShowDetailsModal(true);
  };

  const handleDeleteRole = async (role: Role) => {
    // Prevent deletion of system roles
    if (role.is_system) {
      toast.error('Sistem uloge ne mogu biti obrisane. One su zaštićene.');
      return;
    }

    if (!confirm(`Da li ste sigurni da želite da obrišete ulogu "${role.name}"?`)) {
      return;
    }

    try {
      await apiService.delete(`/admin/roles/${role.id}`);
      toast.success('Uloga uspješno obrisana');
      fetchRoles();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Greška pri brisanju uloge';
      toast.error(errorMessage);
    }
  };

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-purple-600 dark:text-purple-400" />
            Uloge i Dozvole
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Upravljanje ulogama i RBAC sistemom
          </p>
        </div>
        <button
          onClick={handleCreateRole}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus size={18} />
          Nova Uloga
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Uloga</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <FiShield className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sa Dozvolama</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.withPermissions}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <FiLock className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Dodeljeno Korisnicima</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.assignedToUsers}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <FiUsers className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pretraži uloge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={fetchRoles}
            className="btn-secondary flex items-center gap-2"
          >
            <FiRefreshCw size={18} />
            Osveži
          </button>
        </div>
      </div>

      {/* Roles Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Učitavanje uloga...</p>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-8 text-center">
            <FiShield className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'Nema uloga koje odgovaraju pretrazi.' : 'Nema uloga. Kreirajte prvu ulogu.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Uloga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dozvole
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Korisnici
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kreirana
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Akcije
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-dark-700">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                          <FiShield className="text-purple-600 dark:text-purple-400" size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {role.name}
                            </span>
                            {role.is_system && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                Sistem
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {role.guard_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {role.permissions && role.permissions.length > 0 ? (
                          <>
                            <FiCheckCircle className="text-green-500" size={16} />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {role.permissions.length} dozvola
                            </span>
                          </>
                        ) : (
                          <>
                            <FiXCircle className="text-gray-400" size={16} />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Nema dozvola
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FiUsers className="text-blue-500" size={16} />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {role.users_count || 0} korisnika
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {role.created_at
                        ? new Date(role.created_at).toLocaleDateString('sr-RS')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewRole(role)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Pregled"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditRole(role)}
                          className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Izmeni"
                          disabled={role.is_system}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className={`p-2 rounded-lg transition-colors ${
                            role.is_system
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                          title={role.is_system ? 'Sistem uloge ne mogu biti obrisane' : 'Obriši'}
                          disabled={role.is_system}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showRoleModal && (
        <RoleModal
          role={selectedRole}
          permissions={permissions}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedRole(null);
          }}
          onSuccess={() => {
            fetchRoles();
            setShowRoleModal(false);
            setSelectedRole(null);
          }}
        />
      )}

      {showDetailsModal && selectedRole && (
        <RoleDetailsModal
          role={selectedRole}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRole(null);
          }}
        />
      )}
    </div>
  );
}











