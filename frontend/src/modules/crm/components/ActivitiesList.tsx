import { useState, useEffect } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { FiPlus, FiActivity, FiSearch, FiEdit, FiTrash2, FiEye, FiCheckCircle } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import ActivityForm from './ActivityForm';

interface Activity {
  id: number;
  type: string;
  subject: string;
  company_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  deal_title?: string;
  scheduled_at?: string;
  completed_at?: string;
  owner_name?: string;
}

export default function ActivitiesList() {
  const { token } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    if (token) {
      loadActivities();
    }
  }, [token, currentPage, searchTerm, filterType]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '15',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (filterType) {
        params.append('type', filterType);
      }
      const response = await apiService.get(`/crm/activities?${params}`);
      
      // Handle both paginated and non-paginated responses
      if (response.data && Array.isArray(response.data)) {
        setActivities(response.data);
        setTotalPages(response.last_page || response.total_pages || 1);
      } else if (Array.isArray(response)) {
        setActivities(response);
        setTotalPages(1);
      } else {
        setActivities([]);
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error('Failed to load activities:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri učitavanju aktivnosti';
      toast.error(errorMessage);
      setActivities([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu aktivnost?')) {
      return;
    }

    try {
      await apiService.delete(`/crm/activities/${id}`);
      toast.success('Aktivnost uspješno obrisana');
      loadActivities();
    } catch (error) {
      console.error('Failed to delete activity:', error);
      toast.error('Greška pri brisanju aktivnosti');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await apiService.put(`/crm/activities/${id}/complete`);
      toast.success('Aktivnost označena kao završena');
      loadActivities();
    } catch (error) {
      console.error('Failed to complete activity:', error);
      toast.error('Greška pri označavanju aktivnosti');
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'call': '📞',
      'meeting': '🤝',
      'email': '✉️',
      'task': '✓',
      'note': '📝',
    };
    return icons[type] || '📋';
  };

  return (
    <Routes>
      <Route index element={
        <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Aktivnosti</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">Upravljanje aktivnostima</p>
            </div>
            <Link to="/crm/activities/new" className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 sm:w-auto sm:py-2">
              <FiPlus />
              Nova Aktivnost
            </Link>
          </div>

          <div className="card p-4 space-y-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pretraži aktivnosti..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-auto sm:py-2 sm:text-sm"
            >
              <option value="">Svi tipovi</option>
              <option value="call">Poziv</option>
              <option value="meeting">Sastanak</option>
              <option value="email">Email</option>
              <option value="task">Zadatak</option>
              <option value="note">Napomena</option>
            </select>
          </div>

          {loading ? (
            <div className="card p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="card p-12 text-center">
              <FiActivity className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">Nema aktivnosti</p>
              <Link to="/crm/activities/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                <FiPlus />
                Dodaj prvu aktivnost
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {activities.map((activity) => (
                  <div key={activity.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getTypeIcon(activity.type)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{activity.subject}</p>
                        {activity.owner_name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{activity.owner_name}</p>
                        )}
                        <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {activity.company_name && <p>🏢 {activity.company_name}</p>}
                          {activity.contact_first_name && (
                            <p>👤 {activity.contact_first_name} {activity.contact_last_name}</p>
                          )}
                          {activity.deal_title && <p>💰 {activity.deal_title}</p>}
                          {activity.scheduled_at && (
                            <p>{new Date(activity.scheduled_at).toLocaleDateString('bs-BA')}</p>
                          )}
                        </div>
                      </div>
                      {activity.completed_at ? (
                        <span className="shrink-0 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                          Završeno
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          U toku
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                      {!activity.completed_at && (
                        <button
                          onClick={() => handleComplete(activity.id)}
                          className="text-green-600 dark:text-green-400"
                          title="Završi aktivnost"
                        >
                          <FiCheckCircle size={20} />
                        </button>
                      )}
                      <Link to={`/crm/activities/${activity.id}`} className="text-blue-600 dark:text-blue-400">
                        <FiEye size={20} />
                      </Link>
                      <Link to={`/crm/activities/${activity.id}/edit`} className="text-yellow-600 dark:text-yellow-400">
                        <FiEdit size={20} />
                      </Link>
                      <button onClick={() => handleDelete(activity.id)} className="text-red-600 dark:text-red-400">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tip</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Predmet</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Povezano sa</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Datum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {activities.map((activity) => (
                        <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-2xl">{getTypeIcon(activity.type)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {activity.subject}
                            </div>
                            {activity.owner_name && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {activity.owner_name}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {activity.company_name && <div>🏢 {activity.company_name}</div>}
                              {activity.contact_first_name && (
                                <div>👤 {activity.contact_first_name} {activity.contact_last_name}</div>
                              )}
                              {activity.deal_title && <div>💰 {activity.deal_title}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {activity.scheduled_at && (
                              <div className="text-sm text-gray-900 dark:text-white">
                                {new Date(activity.scheduled_at).toLocaleDateString('bs-BA')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {activity.completed_at ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Završeno
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                U toku
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!activity.completed_at && (
                                <button
                                  onClick={() => handleComplete(activity.id)}
                                  className="text-green-600 dark:text-green-400 hover:text-green-900"
                                  title="Završi aktivnost"
                                >
                                  <FiCheckCircle size={18} />
                                </button>
                              )}
                              <Link
                                to={`/crm/activities/${activity.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900"
                              >
                                <FiEye size={18} />
                              </Link>
                              <Link
                                to={`/crm/activities/${activity.id}/edit`}
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900"
                              >
                                <FiEdit size={18} />
                              </Link>
                              <button
                                onClick={() => handleDelete(activity.id)}
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
      <Route path="new" element={<ActivityForm />} />
      <Route path=":id" element={<ActivityForm />} />
      <Route path=":id/edit" element={<ActivityForm />} />
    </Routes>
  );
}

