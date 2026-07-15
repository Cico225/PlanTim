import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FiPackage,
  FiSettings,
  FiUsers,
  FiToggleLeft,
  FiToggleRight,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiCopy,
  FiShield,
  FiEye,
  FiEyeOff,
  FiSearch,
} from 'react-icons/fi';
import { apiService } from '@/services/api';

interface SystemModule {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  route: string;
  available_permissions: string[];
  is_active: boolean;
  is_plugin: boolean;
  sort_order: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  guard_name: string;
  is_system?: boolean;
}

interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: any[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

interface ModulePermission {
  module_name: string;
  display_name: string;
  icon: string;
  is_plugin: boolean;
  available_permissions: string[];
  can_view: boolean;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_import: boolean;
  custom_permissions: Record<string, boolean> | null;
}

export default function ModuleManagement() {
  // ModuleManagement component initialized
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'modules' | 'permissions' | 'role-management'>('modules');
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<ModulePermission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleModulePermissions, setRoleModulePermissions] = useState<ModulePermission[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadModules(), loadUsers(''), loadRoles()]);
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Debounce search for users
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'permissions') {
        loadUsers(userSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery, activeTab]);

  // Load role module permissions when role-management tab is active and role is selected
  useEffect(() => {
    if (activeTab === 'role-management' && selectedRole) {
      loadRoleModulePermissions(selectedRole.id);
    }
  }, [activeTab, selectedRole]);

  const loadModules = async () => {
    try {
      console.log('🔄 Loading modules from /admin/modules...');
      const data = await apiService.get<any[]>('/admin/modules');
      console.log('📦 Modules API response:', data);
      
      if (!data) {
        console.warn('⚠️ No data received from API');
        setModules([]);
        return;
      }
      
      if (!Array.isArray(data)) {
        console.warn('⚠️ Response is not an array:', typeof data);
        setModules([]);
        return;
      }
      
      // Parse available_permissions if it's a string
      const parsedModules = data.map(module => {
        let permissions = [];
        try {
          if (Array.isArray(module.available_permissions)) {
            permissions = module.available_permissions;
          } else if (typeof module.available_permissions === 'string') {
            permissions = JSON.parse(module.available_permissions || '[]');
          }
        } catch (e) {
          console.warn('⚠️ Failed to parse permissions:', e);
          permissions = [];
        }
        
        return {
          ...module,
          available_permissions: permissions
        };
      });
      
      console.log('✅ Parsed modules:', parsedModules.length, 'modules');
      setModules(parsedModules);
    } catch (error: any) {
      console.error('❌ Error loading modules:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      toast.error(t('admin.failedToLoadModules') || 'Failed to load modules');
      setModules([]);
    }
  };

  const loadUsers = async (searchQuery: string = '') => {
    try {
      const params: any = {};
      if (searchQuery) {
        params.search = searchQuery;
      }
      // Load all users (no pagination limit for this use case)
      params.per_page = 1000;
      
      const response = await apiService.get<PaginatedResponse<User>>('/admin/users', params);
      
      // Handle paginated response - users are in response.data
      const users = response.data || [];
      setUsers(users);
      
      // Set first user as selected by default only if no user is currently selected
      if (users.length > 0 && !selectedUser) {
        setSelectedUser(users[0]);
        // Load permissions for the first user
        await loadUserPermissions(users[0].id);
      } else if (users.length > 0 && selectedUser) {
        // If user is selected, check if it still exists in filtered list
        const userStillExists = users.find(u => u.id === selectedUser.id);
        if (!userStillExists && users.length > 0) {
          // Selected user is not in filtered results, select first one
          setSelectedUser(users[0]);
          await loadUserPermissions(users[0].id);
        }
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      toast.error(t('admin.failedToLoadUsers') || 'Failed to load users');
    }
  };

  const loadUserPermissions = async (userId: number) => {
    try {
      const data = await apiService.get<ModulePermission[]>(`/admin/users/${userId}/module-permissions`);
      setUserPermissions(data);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      toast.error(t('admin.failedToLoadPermissions') || 'Failed to load user permissions');
    }
  };

  const loadRoles = async () => {
    try {
      console.log('🔄 Loading roles from /admin/roles...');
      const data = await apiService.get<Role[]>('/admin/roles');
      console.log('✅ Roles loaded:', data?.length || 0, 'roles');
      setRoles(data || []);
      
      // Set first role as selected by default
      if (data && data.length > 0) {
        setSelectedRole(data[0]);
        await loadRoleModulePermissions(data[0].id);
      }
    } catch (error: any) {
      console.error('❌ Error loading roles:', error);
      console.error('Error response:', error.response?.data);
      toast.error(t('admin.failedToLoadRoles') || 'Failed to load roles');
      setRoles([]);
    }
  };

  const loadRoleModulePermissions = async (roleId: number) => {
    try {
      console.log('🔄 Loading role module permissions for role:', roleId);
      const data = await apiService.get<ModulePermission[]>(`/admin/roles/${roleId}/module-permissions`);
      console.log('✅ Role module permissions loaded:', data?.length || 0, 'modules');
      setRoleModulePermissions(data || []);
    } catch (error: any) {
      console.error('❌ Error loading role module permissions:', error);
      console.error('Error response:', error.response?.data);
      toast.error(t('admin.failedToLoadPermissions') || 'Failed to load role module permissions');
      setRoleModulePermissions([]);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    loadRoleModulePermissions(role.id);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    loadUserPermissions(user.id);
  };

  const toggleModuleStatus = async (moduleId: number, isActive: boolean) => {
    try {
      await apiService.put(`/admin/modules/${moduleId}`, { is_active: isActive });
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, is_active: isActive } : m
      ));
      toast.success(isActive ? (t('admin.moduleActivated') || 'Modul aktiviran') : (t('admin.moduleDeactivated') || 'Modul deaktiviran'));
    } catch (error: any) {
      console.error('Error updating module:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.is_active?.[0] || (t('admin.failedToUpdateModule') || 'Greška pri ažuriranju modula');
      toast.error(errorMessage);
      // Revert the change on error
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, is_active: !isActive } : m
      ));
    }
  };

  const updatePermission = (moduleIndex: number, permission: string, value: boolean) => {
    setUserPermissions(prev => prev.map((perm, index) => 
      index === moduleIndex 
        ? { ...perm, [permission]: value }
        : perm
    ));
  };

  const updateCustomPermission = (moduleIndex: number, customPerm: string, value: boolean) => {
    setUserPermissions(prev => prev.map((perm, index) => 
      index === moduleIndex 
        ? { 
            ...perm, 
            custom_permissions: {
              ...perm.custom_permissions,
              [customPerm]: value
            }
          }
        : perm
    ));
  };

  // Toggle all permissions for a single module
  const toggleAllModulePermissions = (moduleIndex: number, enable: boolean) => {
    setUserPermissions(prev => prev.map((perm, index) => {
      if (index !== moduleIndex) return perm;
      
      // Build custom permissions object with all permissions enabled/disabled
      const customPerms: Record<string, boolean> = {};
      if (perm.available_permissions) {
        perm.available_permissions.forEach(cp => {
          customPerms[cp] = enable;
        });
      }
      
      return {
        ...perm,
        can_view: enable,
        can_read: enable,
        can_create: enable,
        can_update: enable,
        can_delete: enable,
        can_export: enable,
        can_import: enable,
        custom_permissions: customPerms
      };
    }));
  };

  // Check if all permissions are enabled for a module
  const areAllPermissionsEnabled = (permission: ModulePermission): boolean => {
    const basicPermissions = 
      Boolean(permission.can_view) && 
      Boolean(permission.can_read) && 
      Boolean(permission.can_create) && 
      Boolean(permission.can_update) && 
      Boolean(permission.can_delete) && 
      Boolean(permission.can_export) && 
      Boolean(permission.can_import);
    
    if (!basicPermissions) return false;
    
    // Check custom permissions if they exist
    if (permission.available_permissions && permission.available_permissions.length > 0) {
      return permission.available_permissions.every(cp => 
        permission.custom_permissions?.[cp] === true
      );
    }
    
    return true;
  };

  // Check if any permission is enabled (for showing module in menu)
  const hasAnyPermission = (permission: ModulePermission): boolean => {
    return Boolean(permission.can_view);
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      await apiService.put(`/admin/users/${selectedUser.id}/module-permissions`, {
        permissions: userPermissions
      });
      toast.success(t('admin.permissionsUpdated') || 'Dozvole uspješno ažurirane');
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.permissions?.[0] || (t('admin.failedToSavePermissions') || 'Greška pri čuvanju dozvola');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updateRoleModulePermission = (moduleIndex: number, permission: string, value: boolean) => {
    setRoleModulePermissions(prev => prev.map((perm, index) => 
      index === moduleIndex 
        ? { ...perm, [permission]: value }
        : perm
    ));
  };

  const updateRoleModuleCustomPermission = (moduleIndex: number, customPerm: string, value: boolean) => {
    setRoleModulePermissions(prev => prev.map((perm, index) => 
      index === moduleIndex 
        ? { 
            ...perm, 
            custom_permissions: {
              ...perm.custom_permissions,
              [customPerm]: value
            }
          }
        : perm
    ));
  };

  const toggleAllRoleModulePermissions = (moduleIndex: number, enable: boolean) => {
    setRoleModulePermissions(prev => prev.map((perm, index) => {
      if (index !== moduleIndex) return perm;
      
      const customPerms: Record<string, boolean> = {};
      if (perm.available_permissions) {
        perm.available_permissions.forEach(cp => {
          customPerms[cp] = enable;
        });
      }
      
      return {
        ...perm,
        can_view: enable,
        can_read: enable,
        can_create: enable,
        can_update: enable,
        can_delete: enable,
        can_export: enable,
        can_import: enable,
        custom_permissions: customPerms
      };
    }));
  };

  const saveRoleModulePermissions = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      await apiService.put(`/admin/roles/${selectedRole.id}/module-permissions`, {
        permissions: roleModulePermissions
      });
      toast.success(t('admin.permissionsUpdated') || 'Dozvole uspješno ažurirane');
    } catch (error: any) {
      console.error('Error saving role module permissions:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.permissions?.[0] || (t('admin.failedToSavePermissions') || 'Greška pri čuvanju dozvola');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const copyPermissions = async (sourceUserId: number, targetUserIds: number[]) => {
    try {
      await apiService.post('/admin/copy-permissions', {
        source_user_id: sourceUserId,
        target_user_ids: targetUserIds
      });
      toast.success('Permissions copied successfully');
      if (selectedUser && targetUserIds.includes(selectedUser.id)) {
        loadUserPermissions(selectedUser.id);
      }
    } catch (error) {
      console.error('Error copying permissions:', error);
      toast.error('Failed to copy permissions');
    }
  };

  const getPermissionIcon = (permission: string) => {
    const icons: Record<string, React.ComponentType> = {
      can_view: FiEye,
      can_read: FiEye,
      can_create: FiPlus,
      can_update: FiEdit2,
      can_delete: FiTrash2,
      can_export: FiPackage,
      can_import: FiPackage,
    };
    return icons[permission] || FiShield;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('admin.moduleManagement')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('admin.manageModulesAndPermissions')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'modules'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiPackage className="inline-block w-4 h-4 mr-2" />
            {t('admin.modules')}
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiShield className="inline-block w-4 h-4 mr-2" />
            {t('admin.userPermissions')}
          </button>
          <button
            onClick={() => setActiveTab('role-management')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'role-management'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiShield className="inline-block w-4 h-4 mr-2" />
            {t('admin.roleManagement')}
          </button>
        </nav>
      </div>

      {/* Modules Tab */}
      {activeTab === 'modules' && (
        <>
          {modules.length === 0 ? (
            <div className="card p-8 text-center">
              <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('admin.noModules') || 'Nema modula'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {t('admin.noModulesDescription') || 'Nema modula za prikaz'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    module.is_plugin 
                      ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                  }`}>
                    <FiPackage className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {module.display_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {module.is_plugin ? 'Plugin' : 'Core Module'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleModuleStatus(module.id, !module.is_active)}
                  className={`p-1 rounded ${
                    module.is_active
                      ? 'text-green-600 hover:text-green-700'
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
                >
                  {module.is_active ? (
                    <FiToggleRight className="w-6 h-6" />
                  ) : (
                    <FiToggleLeft className="w-6 h-6" />
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                {module.description}
              </p>

              {module.available_permissions && module.available_permissions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {t('admin.availablePermissions')}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {module.available_permissions.map((perm: string) => (
                      <span
                        key={perm}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      >
                        {perm.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Route: {module.route || 'N/A'}
                </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                  module.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {module.is_active ? t('admin.active') : t('admin.inactive')}
                </span>
              </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* User List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  {t('admin.selectUser')}
                </h3>
                {/* Search Input */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={t('admin.searchUsers') || 'Pretraži korisnike...'}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {userSearchQuery ? (t('admin.noUsersFound') || 'Nema korisnika') : (t('admin.noUsers') || 'Nema korisnika')}
                  </div>
                ) : (
                  users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      selectedUser?.id === user.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      {!user.is_active && (
                        <FiEyeOff className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-3">
            {selectedUser ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {t('admin.permissionsFor')} {selectedUser.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedUser.email}
                      </p>
                    </div>
                    <button
                      onClick={saveUserPermissions}
                      disabled={saving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <FiSettings className="w-4 h-4" />
                      )}
                      <span>{saving ? t('common.saving') : t('common.save')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {userPermissions.map((permission, index) => {
                    const allEnabled = areAllPermissionsEnabled(permission);
                    const hasPermission = hasAnyPermission(permission);
                    
                    return (
                    <div
                      key={permission.module_name}
                      className={`border rounded-lg p-4 transition-colors ${
                        hasPermission 
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            permission.is_plugin
                              ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                          }`}>
                            <FiPackage className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {permission.display_name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {permission.is_plugin ? t('admin.plugin') : t('admin.coreModule')}
                              {!hasPermission && (
                                <span className="ml-2 text-red-500">
                                  • {t('admin.notVisibleInMenu') || 'Nije vidljivo u meniju'}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        {/* Allow All Toggle */}
                        <button
                          onClick={() => toggleAllModulePermissions(index, !allEnabled)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                            allEnabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                          }`}
                        >
                          {allEnabled ? (
                            <>
                              <FiToggleRight className="w-4 h-4" />
                              <span>{t('admin.allEnabled') || 'Sve dozvoljeno'}</span>
                            </>
                          ) : (
                            <>
                              <FiToggleLeft className="w-4 h-4" />
                              <span>{t('admin.allowAll') || 'Dozvoli sve'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Basic Permissions */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {['can_view', 'can_read', 'can_create', 'can_update', 'can_delete', 'can_export', 'can_import'].map((perm) => {
                          const IconComponent = getPermissionIcon(perm);
                          const isViewPermission = perm === 'can_view';
                          return (
                            <label key={perm} className={`flex items-center space-x-2 cursor-pointer ${isViewPermission ? 'font-medium' : ''}`}>
                              <input
                                type="checkbox"
                                checked={Boolean(permission[perm as keyof ModulePermission])}
                                onChange={(e) => updatePermission(index, perm, e.target.checked)}
                                className={`rounded border-gray-300 focus:ring-blue-500 ${
                                  isViewPermission ? 'text-green-600' : 'text-blue-600'
                                }`}
                              />
                              <IconComponent className={`w-4 h-4 ${isViewPermission ? 'text-green-500' : 'text-gray-500'}`} />
                              <span className={`text-sm ${isViewPermission ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {perm === 'can_view' ? (t('admin.canView') || 'vidljivo') : perm.replace('can_', '').replace('_', ' ')}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Custom Permissions */}
                      {permission.available_permissions && permission.available_permissions.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('admin.moduleSpecificPermissions')}:
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {permission.available_permissions.map((customPerm) => (
                              <label key={customPerm} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={permission.custom_permissions?.[customPerm] || false}
                                  onChange={(e) => updateCustomPermission(index, customPerm, e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {customPerm.replace(/_/g, ' ')}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('admin.selectUserToManagePermissions')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('admin.chooseUserFromList')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Role Management Tab */}
      {activeTab === 'role-management' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Role List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {t('admin.selectRole')}
                </h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {roles.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('admin.noRoles')}
                  </div>
                ) : (
                  roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      selectedRole?.id === role.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                          <FiShield className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {role.display_name || role.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {role.name}
                        </p>
                        {role.is_system && (
                          <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                            {t('admin.systemRole')}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Role Module Permissions Panel */}
          <div className="lg:col-span-3">
            {selectedRole ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {t('admin.modulePermissionsFor')} {selectedRole.display_name || selectedRole.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedRole.name}
                      </p>
                    </div>
                    <button
                      onClick={saveRoleModulePermissions}
                      disabled={saving}
                      className="btn-primary flex items-center space-x-2"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <FiSettings className="w-4 h-4" />
                      )}
                      <span>{saving ? t('common.saving') : t('common.save')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {roleModulePermissions.map((permission, index) => {
                    const allEnabled = areAllPermissionsEnabled(permission);
                    const hasPermission = hasAnyPermission(permission);
                    
                    return (
                    <div
                      key={permission.module_name}
                      className={`border rounded-lg p-4 transition-colors ${
                        hasPermission 
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            permission.is_plugin
                              ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                          }`}>
                            <FiPackage className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {permission.display_name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {permission.is_plugin ? t('admin.plugin') : t('admin.coreModule')}
                              {!hasPermission && (
                                <span className="ml-2 text-red-500">
                                  • {t('admin.notVisibleInMenu')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        {/* Allow All Toggle */}
                        <button
                          onClick={() => toggleAllRoleModulePermissions(index, !allEnabled)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                            allEnabled
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                          }`}
                        >
                          {allEnabled ? (
                            <>
                              <FiToggleRight className="w-4 h-4" />
                              <span>{t('admin.allEnabled')}</span>
                            </>
                          ) : (
                            <>
                              <FiToggleLeft className="w-4 h-4" />
                              <span>{t('admin.allowAll')}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Basic Permissions */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {['can_view', 'can_read', 'can_create', 'can_update', 'can_delete', 'can_export', 'can_import'].map((perm) => {
                          const IconComponent = getPermissionIcon(perm);
                          const isViewPermission = perm === 'can_view';
                          return (
                            <label key={perm} className={`flex items-center space-x-2 cursor-pointer ${isViewPermission ? 'font-medium' : ''}`}>
                              <input
                                type="checkbox"
                                checked={Boolean(permission[perm as keyof ModulePermission])}
                                onChange={(e) => updateRoleModulePermission(index, perm, e.target.checked)}
                                className={`rounded border-gray-300 focus:ring-blue-500 ${
                                  isViewPermission ? 'text-green-600' : 'text-blue-600'
                                }`}
                              />
                              <IconComponent className={`w-4 h-4 ${isViewPermission ? 'text-green-500' : 'text-gray-500'}`} />
                              <span className={`text-sm ${isViewPermission ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {perm === 'can_view' ? t('admin.canView') : perm.replace('can_', '').replace('_', ' ')}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Custom Permissions */}
                      {permission.available_permissions && permission.available_permissions.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('admin.moduleSpecificPermissions')}:
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {permission.available_permissions.map((customPerm) => (
                              <label key={customPerm} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={permission.custom_permissions?.[customPerm] || false}
                                  onChange={(e) => updateRoleModuleCustomPermission(index, customPerm, e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {customPerm.replace(/_/g, ' ')}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <FiShield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {t('admin.selectRoleToManage')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('admin.chooseRoleFromList')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
