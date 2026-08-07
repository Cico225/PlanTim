import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiPlus,
  FiFilter,
  FiDownload,
  FiUpload,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiUserCheck,
  FiUserX,
  FiMoreVertical,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiRefreshCw,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import UserModal from '../components/UserModal';
import UserDetailsModal from '../components/UserDetailsModal';
import RoleAssignModal from '../components/RoleAssignModal';
import BulkActionsBar from '../components/BulkActionsBar';
import UserFilters from '../components/UserFilters';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  roles?: string[];
  permissions?: string[];
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    is_active: 'all',
    role: 'all',
    sort: 'created_at_desc',
  });
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Bulk actions
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    newThisMonth: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.current_page, searchQuery, filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current_page,
        search: searchQuery,
        is_active: filters.is_active !== 'all' ? filters.is_active : undefined,
        role: filters.role !== 'all' ? filters.role : undefined,
        sort: filters.sort,
      };

      const response = await apiService.get('/admin/users', params);
      setUsers(response.data);
      setPagination({
        current_page: response.current_page,
        last_page: response.last_page,
        per_page: response.per_page,
        total: response.total,
      });

      // Calculate stats
      setStats({
        total: response.total,
        active: response.data.filter((u: User) => u.is_active).length,
        inactive: response.data.filter((u: User) => !u.is_active).length,
        newThisMonth: response.data.filter((u: User) => {
          const created = new Date(u.created_at);
          const now = new Date();
          return (
            created.getMonth() === now.getMonth() &&
            created.getFullYear() === now.getFullYear()
          );
        }).length,
      });
    } catch (error: any) {
      toast.error('Greška pri učitavanju korisnika');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleAssignRole = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovog korisnika?')) return;

    try {
      await apiService.delete(`/admin/users/${userId}`);
      toast.success('Korisnik uspješno obrisan');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri brisanju korisnika');
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await apiService.put(`/admin/users/${userId}`, {
        is_active: !currentStatus,
      });
      toast.success(`Korisnik ${!currentStatus ? 'aktiviran' : 'deaktiviran'}`);
      fetchUsers();
    } catch (error: any) {
      toast.error('Greška pri promeni statusa');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Da li ste sigurni da želite obrisati ${selectedUsers.length} korisnika?`)) return;

    try {
      await Promise.all(selectedUsers.map(id => apiService.delete(`/admin/users/${id}`)));
      toast.success(`${selectedUsers.length} korisnika obrisano`);
      setSelectedUsers([]);
      setShowBulkActions(false);
      fetchUsers();
    } catch (error) {
      toast.error('Greška pri brisanju korisnika');
    }
  };

  const handleBulkActivate = async () => {
    try {
      await Promise.all(
        selectedUsers.map(id =>
          apiService.put(`/admin/users/${id}`, { is_active: true })
        )
      );
      toast.success(`${selectedUsers.length} korisnika aktivirano`);
      setSelectedUsers([]);
      setShowBulkActions(false);
      fetchUsers();
    } catch (error) {
      toast.error('Greška pri aktivaciji korisnika');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      await Promise.all(
        selectedUsers.map(id =>
          apiService.put(`/admin/users/${id}`, { is_active: false })
        )
      );
      toast.success(`${selectedUsers.length} korisnika deaktivirano`);
      setSelectedUsers([]);
      setShowBulkActions(false);
      fetchUsers();
    } catch (error) {
      toast.error('Greška pri deaktivaciji korisnika');
    }
  };

  const handleExportUsers = async () => {
    try {
      toast.success('Export korisnika u toku...');
      // Implement export functionality
    } catch (error) {
      toast.error('Greška pri exportu korisnika');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(u => u.id));
      setShowBulkActions(true);
    } else {
      setSelectedUsers([]);
      setShowBulkActions(false);
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      const newSelected = [...selectedUsers, userId];
      setSelectedUsers(newSelected);
      setShowBulkActions(newSelected.length > 0);
    } else {
      const newSelected = selectedUsers.filter(id => id !== userId);
      setSelectedUsers(newSelected);
      setShowBulkActions(newSelected.length > 0);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nikad';
    return new Date(dateString).toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
            <FiUsers className="text-primary-600 dark:text-primary-400" size={24} />
            <span className="truncate">Upravljanje Korisnicima</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Kompletan pregled i upravljanje svim korisnicima sistema
          </p>
        </div>
        <button onClick={handleCreateUser} className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto">
          <FiPlus size={20} />
          <span className="hidden sm:inline">Novi Korisnik</span>
          <span className="sm:hidden">Novi</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="card p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Ukupno</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUsers className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Aktivni</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {stats.active}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUserCheck className="text-green-600 dark:text-green-400" size={20} />
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Neaktivni</p>
              <p className="text-xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                {stats.inactive}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiUserX className="text-red-600 dark:text-red-400" size={20} />
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Novi</p>
              <p className="text-xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {stats.newThisMonth}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiCalendar className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Pretraži..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full text-sm"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center ${
                showFilters ? 'bg-primary-100 dark:bg-primary-900/20' : ''
              }`}
            >
              <FiFilter size={16} />
              <span className="hidden xs:inline">Filteri</span>
            </button>

            <button onClick={handleExportUsers} className="btn-secondary flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center">
              <FiDownload size={16} />
              <span className="hidden xs:inline">Export</span>
            </button>

            <button onClick={fetchUsers} className="btn-secondary flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center">
              <FiRefreshCw size={16} />
              <span className="hidden xs:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <UserFilters filters={filters} setFilters={setFilters} onClose={() => setShowFilters(false)} />
        )}
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <BulkActionsBar
          selectedCount={selectedUsers.length}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDeactivate}
          onDelete={handleBulkDelete}
          onCancel={() => {
            setSelectedUsers([]);
            setShowBulkActions(false);
          }}
        />
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        {/* Desktop Table View - Hidden on Mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Korisnik
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Kontakt
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Uloga
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Poslednja Prijava
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-dark-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <FiRefreshCw className="animate-spin" size={20} />
                      Učitavanje...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Nema korisnika za prikaz
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <FiMail size={14} />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <FiPhone size={14} />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FiShield size={14} className="text-primary-600 dark:text-primary-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.roles && user.roles.length > 0 ? user.roles[0] : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {user.is_active ? 'Aktivan' : 'Neaktivan'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(user.last_login_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Pregled"
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                          title="Uredi"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleAssignRole(user)}
                          className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Dodjeli ulogu"
                        >
                          <FiShield size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Obriši"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Visible Only on Mobile */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-dark-600">
          {loading ? (
            <div className="px-4 py-12 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <FiRefreshCw className="animate-spin" size={20} />
                Učitavanje...
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
              Nema korisnika za prikaz
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4">
                {/* Header with checkbox and avatar */}
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 mt-1"
                  />
                  <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex items-center gap-1">
                      <FiMail size={12} />
                      {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex items-center gap-1">
                        <FiPhone size={12} />
                        {user.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uloga</p>
                    <div className="flex items-center gap-1">
                      <FiShield size={12} className="text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.roles && user.roles.length > 0 ? user.roles[0] : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <button
                      onClick={() => handleToggleStatus(user.id, user.is_active)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {user.is_active ? 'Aktivan' : 'Neaktivan'}
                    </button>
                  </div>
                </div>

                {/* Last Login */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Poslednja prijava</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatDate(user.last_login_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-dark-600">
                  <button
                    onClick={() => handleViewUser(user)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <FiEye size={16} />
                    <span>Pregled</span>
                  </button>
                  <button
                    onClick={() => handleEditUser(user)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  >
                    <FiEdit2 size={16} />
                    <span>Uredi</span>
                  </button>
                  <button
                    onClick={() => handleAssignRole(user)}
                    className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Dodjeli ulogu"
                  >
                    <FiShield size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Obriši"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-dark-600">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              Prikazano {(pagination.current_page - 1) * pagination.per_page + 1} -{' '}
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)} od{' '}
              {pagination.total}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              <button
                onClick={() =>
                  setPagination({ ...pagination, current_page: pagination.current_page - 1 })
                }
                disabled={pagination.current_page === 1}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {[...Array(pagination.last_page)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === pagination.last_page ||
                  (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination({ ...pagination, current_page: page })}
                      className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm min-w-[32px] ${
                        pagination.current_page === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === pagination.current_page - 2 || page === pagination.current_page + 2) {
                  return <span key={page} className="text-gray-400 px-1">...</span>;
                }
                return null;
              })}
              <button
                onClick={() =>
                  setPagination({ ...pagination, current_page: pagination.current_page + 1 })
                }
                disabled={pagination.current_page === pagination.last_page}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUserModal && (
        <UserModal
          user={selectedUser}
          onClose={() => setShowUserModal(false)}
          onSuccess={() => {
            setShowUserModal(false);
            fetchUsers();
          }}
        />
      )}

      {showDetailsModal && selectedUser && (
        <UserDetailsModal user={selectedUser} onClose={() => setShowDetailsModal(false)} />
      )}

      {showRoleModal && selectedUser && (
        <RoleAssignModal
          user={selectedUser}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
            // Force refresh users list
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}


