import { useState, useEffect } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { FiPlus, FiSearch, FiDollarSign, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import DealForm from './DealForm';
import DealDetail from './DealDetail';

interface Deal {
  id: number;
  title: string;
  company_name?: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  owner_name?: string;
}

export default function DealsList() {
  const { token } = useAuthStore();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (token) {
      loadDeals();
    }
  }, [token, currentPage, searchTerm]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '15',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await apiService.get(`/crm/deals?${params}`);
      setDeals(response.data || []);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error('Failed to load deals:', error);
      toast.error('Greška pri učitavanju deal-ova');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj deal?')) {
      return;
    }

    try {
      await apiService.delete(`/crm/deals/${id}`);
      toast.success('Deal uspješno obrisan');
      loadDeals();
    } catch (error) {
      console.error('Failed to delete deal:', error);
      toast.error('Greška pri brisanju deal-a');
    }
  };

  const formatCurrency = (value: number, currency: string = 'BAM') => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'lead': 'bg-gray-500',
      'qualified': 'bg-blue-500',
      'proposal': 'bg-yellow-500',
      'negotiation': 'bg-orange-500',
      'closed-won': 'bg-green-500',
      'closed-lost': 'bg-red-500',
    };
    return colors[stage] || 'bg-gray-500';
  };

  return (
    <Routes>
      <Route index element={
        <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Deal-ovi</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">Upravljanje prodajnim prilikama</p>
            </div>
            <Link to="/crm/deals/new" className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 sm:w-auto sm:py-2">
              <FiPlus />
              Novi Deal
            </Link>
          </div>

          <div className="card p-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pretraži deal-ove..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="card p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : deals.length === 0 ? (
            <div className="card p-12 text-center">
              <FiDollarSign className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">Nema deal-ova</p>
              <Link to="/crm/deals/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                <FiPlus />
                Dodaj prvi deal
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {deals.map((deal) => (
                  <div key={deal.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">{deal.title}</p>
                        {deal.owner_name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{deal.owner_name}</p>
                        )}
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{deal.company_name || '-'}</p>
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(deal.value, deal.currency)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium text-white ${getStageColor(deal.stage)}`}>
                        {deal.stage}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${deal.probability}%` }} />
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">{deal.probability}%</span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <Link to={`/crm/deals/${deal.id}`} className="text-blue-600 dark:text-blue-400">
                        <FiEye size={20} />
                      </Link>
                      <Link to={`/crm/deals/${deal.id}/edit`} className="text-yellow-600 dark:text-yellow-400">
                        <FiEdit size={20} />
                      </Link>
                      <button onClick={() => handleDelete(deal.id)} className="text-red-600 dark:text-red-400">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Naziv</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kompanija</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vrijednost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Faza</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vjerojatnost</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {deals.map((deal) => (
                        <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {deal.title}
                            </div>
                            {deal.owner_name && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {deal.owner_name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {deal.company_name || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(deal.value, deal.currency)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(deal.stage)} text-white`}>
                              {deal.stage}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${deal.probability}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-900 dark:text-white w-12">
                                {deal.probability}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/crm/deals/${deal.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900"
                              >
                                <FiEye size={18} />
                              </Link>
                              <Link
                                to={`/crm/deals/${deal.id}/edit`}
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900"
                              >
                                <FiEdit size={18} />
                              </Link>
                              <button
                                onClick={() => handleDelete(deal.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900"
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

              {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary w-full py-2.5 disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    Prethodna
                  </button>
                  <span className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Strana {currentPage} od {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary w-full py-2.5 disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    Sljedeća
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      } />
      <Route path="new" element={<DealForm />} />
      <Route path=":id" element={<DealDetail />} />
      <Route path=":id/edit" element={<DealForm />} />
    </Routes>
  );
}

