import { useState, useEffect } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiEye, FiBriefcase } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import AccountForm from './AccountForm';
import AccountDetail from './AccountDetail';

interface Account {
  id: number;
  name: string;
  legal_name?: string;
  type?: string;
  status?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  size?: string;
  city?: string;
  country?: string;
  contacts_count: number;
  deals_count: number;
  deals_total_value: number;
  owner_name?: string;
}

export default function AccountsList() {
  const { token } = useAuthStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (token) {
      loadAccounts();
    }
  }, [token, currentPage, searchTerm]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '15',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await apiService.get(`/crm/companies?${params}`);
      setAccounts(response.data || []);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error('Failed to load accounts:', error);
      toast.error('Greška pri učitavanju kompanija');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu kompaniju?')) {
      return;
    }

    try {
      await apiService.delete(`/crm/companies/${id}`);
      toast.success('Kompanija uspješno obrisana');
      loadAccounts();
    } catch (error) {
      console.error('Failed to delete company:', error);
      toast.error('Greška pri brisanju kompanije');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  return (
    <Routes>
      <Route index element={
        <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                Kompanije
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
                Upravljanje kompanijama i organizacijama
              </p>
            </div>
            <Link to="/crm/accounts/new" className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 sm:w-auto sm:py-2">
              <FiPlus />
              Nova Kompanija
            </Link>
          </div>

          {/* Search */}
          <div className="card p-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pretraži kompanije..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Accounts Table */}
          {loading ? (
            <div className="card p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Učitavanje kompanija...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="card p-12 text-center">
              <FiBriefcase className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">Nema kompanija</p>
              <Link to="/crm/accounts/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                <FiPlus />
                Dodaj prvu kompaniju
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {accounts.map((account) => (
                  <div key={account.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-blue-500 text-sm font-semibold text-white">
                        {account.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                        {account.website && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 break-all">{account.website}</p>
                        )}
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 break-all">{account.email || '-'}</p>
                        {account.phone && <p className="text-sm text-gray-500">{account.phone}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>Kontakti: {account.contacts_count || 0}</span>
                          <span>Deal-ovi: {account.deals_count || 0}</span>
                          <span>{formatCurrency(account.deals_total_value || 0)}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                        account.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : account.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {account.status || 'active'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <Link to={`/crm/accounts/${account.id}`} className="text-blue-600 dark:text-blue-400">
                        <FiEye size={20} />
                      </Link>
                      <Link to={`/crm/accounts/${account.id}/edit`} className="text-yellow-600 dark:text-yellow-400">
                        <FiEdit size={20} />
                      </Link>
                      <button onClick={() => handleDelete(account.id)} className="text-red-600 dark:text-red-400">
                        <FiTrash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Kompanija
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Kontakt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Kontakti
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Deal-ovi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Vrijednost
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Akcije
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {accounts.map((account) => (
                        <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                {account.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {account.name}
                                </div>
                                {account.website && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {account.website}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {account.email || '-'}
                            </div>
                            {account.phone && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {account.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              account.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : account.status === 'inactive'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {account.status || 'active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {account.contacts_count || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {account.deals_count || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(account.deals_total_value || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/crm/accounts/${account.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              >
                                <FiEye size={18} />
                              </Link>
                              <Link
                                to={`/crm/accounts/${account.id}/edit`}
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                              >
                                <FiEdit size={18} />
                              </Link>
                              <button
                                onClick={() => handleDelete(account.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    Prethodna
                  </button>
                  <span className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Strana {currentPage} od {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    Sljedeća
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      } />
      <Route path="new" element={<AccountForm />} />
      <Route path=":id" element={<AccountDetail />} />
      <Route path=":id/edit" element={<AccountForm />} />
    </Routes>
  );
}

