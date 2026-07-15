import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiBriefcase, FiDollarSign, FiActivity, FiTrendingUp, FiPlus } from 'react-icons/fi';
import { apiService } from '@/services/api';

interface CRMStats {
  contacts_count: number;
  companies_count: number;
  deals_count: number;
  activities_count: number;
  deals_total_value: number;
  deals_by_stage: Array<{
    stage: string;
    count: number;
    total_value: number;
  }>;
  recent_activities: Array<any>;
}

export default function CRMDashboard() {
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/crm');
      setStats(response);
    } catch (error) {
      console.error('Failed to load CRM stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 2,
    }).format(value);
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

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'lead': 'Lead',
      'qualified': 'Kvalifikovan',
      'proposal': 'Ponuda',
      'negotiation': 'Pregovori',
      'closed-won': 'Zatvoreno - Pobijedio',
      'closed-lost': 'Zatvoreno - Izgubio',
    };
    return labels[stage] || stage;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            CRM Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Pregled klijenata, kompanija i deal-ova
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link to="/crm/contacts/new" className="btn-primary flex items-center justify-center gap-2 py-2.5 text-sm sm:py-2">
            <FiPlus />
            Novi Kontakt
          </Link>
          <Link to="/crm/accounts/new" className="btn-primary flex items-center justify-center gap-2 py-2.5 text-sm sm:py-2">
            <FiPlus />
            Nova Kompanija
          </Link>
          <Link to="/crm/deals/new" className="btn-primary flex items-center justify-center gap-2 py-2.5 text-sm sm:py-2">
            <FiPlus />
            Novi Deal
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/crm/contacts" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Kontakti
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.contacts_count || 0}
              </p>
            </div>
            <div className="bg-blue-500 p-4 rounded-lg text-white">
              <FiUsers size={24} />
            </div>
          </div>
        </Link>

        <Link to="/crm/accounts" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Kompanije
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.companies_count || 0}
              </p>
            </div>
            <div className="bg-green-500 p-4 rounded-lg text-white">
              <FiBriefcase size={24} />
            </div>
          </div>
        </Link>

        <Link to="/crm/deals" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Deal-ovi
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.deals_count || 0}
              </p>
            </div>
            <div className="bg-yellow-500 p-4 rounded-lg text-white">
              <FiDollarSign size={24} />
            </div>
          </div>
        </Link>

        <Link to="/crm/activities" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Aktivnosti
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats?.activities_count || 0}
              </p>
            </div>
            <div className="bg-purple-500 p-4 rounded-lg text-white">
              <FiActivity size={24} />
            </div>
          </div>
        </Link>
      </div>

      {/* Total Value and Deals by Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Value */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Ukupna Vrijednost Deal-ova
            </h2>
            <FiTrendingUp className="text-green-500" size={24} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl break-words">
            {formatCurrency(stats?.deals_total_value || 0)}
          </p>
        </div>

        {/* Deals by Stage */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Deal-ovi po Fazama
          </h2>
          <div className="space-y-3">
            {stats?.deals_by_stage && stats.deals_by_stage.length > 0 ? (
              stats.deals_by_stage.map((stage) => (
                <div key={stage.stage} className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={`h-3 w-3 shrink-0 rounded-full ${getStageColor(stage.stage)}`}></div>
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getStageLabel(stage.stage)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stage.count} deal-ova
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(stage.total_value || 0)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nema deal-ova</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      {stats?.recent_activities && stats.recent_activities.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Nedavne Aktivnosti
            </h2>
            <Link to="/crm/activities" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              Vidi sve
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recent_activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.completed_at ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.subject}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.type} • {activity.owner_name}
                  </p>
                </div>
                {activity.scheduled_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(activity.scheduled_at).toLocaleDateString('bs-BA')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}






















