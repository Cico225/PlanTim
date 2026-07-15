import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit, FiArrowLeft, FiDollarSign, FiActivity, FiFile, FiTag, FiCalendar, FiTrendingUp, FiBriefcase, FiUser } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import Timeline from './Timeline';
import DocumentList from './DocumentList';
import TagManager from './TagManager';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'tasks' | 'documents' | 'timeline'>('overview');

  useEffect(() => {
    if (id) {
      loadDeal();
      loadTasks();
    }
  }, [id]);

  const loadDeal = async () => {
    try {
      setLoading(true);
      const dealData = await apiService.get(`/crm/deals/${id}`);
      setDeal(dealData);
      setActivities(dealData.activities || []);
    } catch (error) {
      console.error('Failed to load deal:', error);
      toast.error('Greška pri učitavanju deal-a');
      navigate('/crm/deals');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await apiService.get(`/crm/deals/${id}/tasks`);
      
      // Handle response - could be direct data or wrapped in data property
      const tasksData = Array.isArray(response) ? response : (response?.data || response || []);
      
      setTasks(tasksData);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri učitavanju zadataka';
      toast.error(errorMessage);
      setTasks([]);
    }
  };

  const handleCreateProject = async () => {
    if (!confirm('Kreiraj projekt iz ovog deal-a?')) {
      return;
    }

    try {
      const project = await apiService.post(`/crm/deals/${id}/create-project`);
      toast.success('Projekt uspješno kreiran');
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.error || 'Greška pri kreiranju projekta');
    }
  };

  const formatCurrency = (value: number, currency: string = 'BAM') => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!deal) {
    return null;
  }

  const estimatedRevenue = deal.value * (deal.probability / 100);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/crm/deals')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <FiArrowLeft />
          Nazad na listu
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{deal.title}</h1>
            {deal.company_name && (
              <Link to={`/crm/accounts/${deal.company_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                {deal.company_name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {deal.stage === 'closed-won' && !deal.project_id && (
              <button
                onClick={handleCreateProject}
                className="btn-primary flex items-center gap-2"
              >
                <FiBriefcase />
                Kreiraj Projekt
              </button>
            )}
            <Link
              to={`/crm/deals/${id}/edit`}
              className="btn-primary flex items-center gap-2"
            >
              <FiEdit />
              Uredi
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Pregled' },
            { key: 'activities', label: 'Aktivnosti', count: activities.length },
            { key: 'tasks', label: 'Zadaci', count: tasks.length },
            { key: 'documents', label: 'Dokumenti' },
            { key: 'timeline', label: 'Timeline' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financijski Podaci</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vrijednost</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(deal.value, deal.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vjerojatnost</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {deal.probability}%
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Procijenjeni Prihod</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(estimatedRevenue, deal.currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Faza</p>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
                      {deal.stage}
                    </span>
                  </div>
                  {deal.expected_close_date && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Očekivani Datum Zatvaranja</p>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(deal.expected_close_date).toLocaleDateString('bs-BA')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {deal.description && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Opis</h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{deal.description}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tagovi</h2>
                <TagManager entityType="deal" entityId={parseInt(id!)} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aktivnosti</h2>
            {activities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Nema aktivnosti</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity: any) => (
                  <div key={activity.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">{activity.subject}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{activity.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Zadaci</h2>
              <Link to={`/crm/deals/${id}/tasks/new`} className="btn-primary flex items-center gap-2">
                <FiActivity />
                Novi Zadatak
              </Link>
            </div>
            {tasks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Nema zadataka</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task: any) => (
                  <Link
                    key={task.id}
                    to={`/projects/${task.project_id}/tasks/${task.id}`}
                    className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{task.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{task.status}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentList entityType="deal" entityId={parseInt(id!)} />
        )}

        {activeTab === 'timeline' && (
          <Timeline entityType="deal" entityId={parseInt(id!)} />
        )}
      </div>
    </div>
  );
}


