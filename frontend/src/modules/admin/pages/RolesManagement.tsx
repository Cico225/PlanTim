import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FiShield,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiRefreshCw,
  FiLock,
  FiSearch,
  FiSave,
  FiSettings,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import RoleModal from '../components/RoleModal';
import ModulePermissionsTree, { type ModulePermission } from '../components/ModulePermissionsTree';

interface Role {
  id: number;
  name: string;
  display_name?: string;
  guard_name: string;
  permissions?: { id: number; name: string }[];
  users_count?: number;
  module_permissions_count?: number;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function RolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleModulePermissions, setRoleModulePermissions] = useState<ModulePermission[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    withPermissions: 0,
    assignedToUsers: 0,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole?.id) {
      loadRoleModulePermissions(selectedRole.id);
    } else {
      setRoleModulePermissions([]);
    }
  }, [selectedRole?.id]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<Role[]>('/admin/roles');
      const list = Array.isArray(data) ? data : [];
      setRoles(list);

      setStats({
        total: list.length,
        withPermissions: list.filter(
          (r) =>
            (r.module_permissions_count && r.module_permissions_count > 0) ||
            (r.permissions && r.permissions.length > 0)
        ).length,
        assignedToUsers: list.filter((r) => r.users_count && r.users_count > 0).length,
      });

      if (selectedRole) {
        const refreshed = list.find((r) => r.id === selectedRole.id);
        if (refreshed) setSelectedRole(refreshed);
      } else if (list.length > 0) {
        setSelectedRole(list[0]);
      }
    } catch (error) {
      toast.error('Greška pri učitavanju uloga');
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoleModulePermissions = async (roleId: number) => {
    setLoadingPerms(true);
    try {
      const data = await apiService.get<ModulePermission[]>(
        `/admin/roles/${roleId}/module-permissions`
      );
      setRoleModulePermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading role module permissions:', error);
      toast.error('Greška pri učitavanju ovlaštenja modula');
      setRoleModulePermissions([]);
    } finally {
      setLoadingPerms(false);
    }
  };

  const saveRoleModulePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await apiService.put(`/admin/roles/${selectedRole.id}`, {
        name: selectedRole.name,
        module_permissions: roleModulePermissions,
      });
      toast.success('Ovlaštenja uloge uspješno sačuvana');
      fetchRoles();
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.errors?.name?.[0] ||
        'Greška pri čuvanju ovlaštenja';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      toast.error('Sistem uloge ne mogu biti obrisane.');
      return;
    }

    if (!confirm(`Da li ste sigurni da želite da obrišete ulogu "${role.name}"?`)) {
      return;
    }

    try {
      await apiService.delete(`/admin/roles/${role.id}`);
      toast.success('Uloga uspješno obrisana');
      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
      }
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju uloge');
    }
  };

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enabledCount = roleModulePermissions.filter((p) => p.can_view).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-purple-600 dark:text-purple-400" />
            Uloge i Dozvole
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Odaberite ulogu i postavite ista ovlaštenja po modulima kao u Moduli i Plugini
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchRoles} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw size={18} />
            Osveži
          </button>
          <button
            onClick={() => setShowRoleModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus size={18} />
            Nova Uloga
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno uloga</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Sa ovlaštenjima</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.withPermissions}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Dodijeljeno korisnicima</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.assignedToUsers}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Role list */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600">
            <div className="p-3 border-b border-gray-200 dark:border-dark-600">
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Pretraži uloge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9 text-sm py-2"
                />
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-gray-500">Učitavanje…</div>
              ) : filteredRoles.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">Nema uloga</div>
              ) : (
                filteredRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left p-3 border-b border-gray-100 dark:border-dark-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-dark-700 ${
                      selectedRole?.id === role.id
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {role.display_name || role.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {role.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <FiUsers size={12} />
                            {role.users_count || 0}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FiLock size={12} />
                            {role.module_permissions_count || 0} mod.
                          </span>
                        </div>
                        {role.is_system && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Sistem
                          </span>
                        )}
                      </div>
                      {!role.is_system && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation();
                              handleDeleteRole(role);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title="Obriši ulogu"
                        >
                          <FiTrash2 size={14} />
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Module permissions panel — same tree as Moduli */}
        <div className="lg:col-span-3">
          {selectedRole ? (
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600">
              <div className="p-4 border-b border-gray-200 dark:border-dark-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <FiSettings className="text-purple-600" />
                    Ovlaštenja modula — {selectedRole.display_name || selectedRole.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Isto stablo kao u Administracija → Moduli i Plugini. Omogućeno:{' '}
                    {enabledCount} / {roleModulePermissions.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveRoleModulePermissions}
                  disabled={saving || loadingPerms}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <FiSave size={16} />
                  )}
                  {saving ? 'Čuvanje…' : 'Sačuvaj ovlaštenja'}
                </button>
              </div>

              <div className="p-4">
                {loadingPerms ? (
                  <div className="py-12 text-center text-gray-500">Učitavanje ovlaštenja…</div>
                ) : (
                  <ModulePermissionsTree
                    permissions={roleModulePermissions}
                    onChange={setRoleModulePermissions}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600 p-10 text-center">
              <FiShield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Odaberite ulogu
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Ili kreirajte novu ulogu da biste postavili ovlaštenja po modulima.
              </p>
            </div>
          )}
        </div>
      </div>

      {showRoleModal && (
        <RoleModal
          role={null}
          onClose={() => setShowRoleModal(false)}
          onSuccess={() => {
            setShowRoleModal(false);
            fetchRoles();
          }}
        />
      )}
    </div>
  );
}
