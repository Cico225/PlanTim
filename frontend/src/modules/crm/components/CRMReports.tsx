import { useState, useEffect } from 'react';
import { FiBarChart2, FiTrendingUp, FiDollarSign, FiUsers, FiActivity } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface FunnelData {
  stage: string;
  stage_key: string;
  count: number;
  total_value: number;
  estimated_revenue: number;
}

interface PerformanceData {
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  open_deals: number;
  total_value: number;
  won_value: number;
  pipeline_value: number;
  win_rate: number;
}

export default function CRMReports() {
  const [funnel, setFunnel] = useState<FunnelData[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const [funnelRes, performanceRes] = await Promise.all([
        apiService.get('/crm/reports/funnel'),
        apiService.get(`/crm/reports/performance?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`),
      ]);
      
      // Handle response - could be direct data or wrapped in data property
      const funnelData = Array.isArray(funnelRes) ? funnelRes : (funnelRes?.data || funnelRes || []);
      const performanceData = performanceRes?.data || performanceRes || null;
      
      setFunnel(funnelData);
      setPerformance(performanceData);
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri učitavanju izvještaja';
      toast.error(errorMessage);
      setFunnel([]);
      setPerformance(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getStageColor = (stageKey: string) => {
    const colors: Record<string, string> = {
      'lead': '#9CA3AF',
      'qualified': '#3B82F6',
      'proposal': '#F59E0B',
      'negotiation': '#EF4444',
      'closed-won': '#10B981',
      'closed-lost': '#6B7280',
    };
    return colors[stageKey] || '#9CA3AF';
  };

  const getStageName = (stageKey: string, stageName: string) => {
    const translations: Record<string, string> = {
      'lead': 'Vod',
      'qualified': 'Kvalificiran',
      'proposal': 'Ponuda',
      'negotiation': 'Pregovori',
      'closed-won': 'Dobiven',
      'closed-lost': 'Izgubljen',
    };
    return translations[stageKey] || stageName;
  };

  const maxCount = funnel.length > 0 ? Math.max(...funnel.map(s => s.count)) : 1;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-6">
      {/* Zaglavlje */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Izvještaji</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">Analitika i izvještaji</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-3">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-auto sm:py-2 sm:text-sm"
          />
          <span className="hidden text-gray-500 sm:inline">do</span>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-auto sm:py-2 sm:text-sm"
          />
        </div>
      </div>

      {/* Kartice Performansi */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Deal-ova</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {performance.total_deals}
                </p>
              </div>
              <div className="bg-blue-500 p-4 rounded-lg text-white">
                <FiBarChart2 size={24} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Dobiveni</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {performance.won_deals}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Stopa Uspjeha: {performance.win_rate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-green-500 p-4 rounded-lg text-white">
                <FiTrendingUp size={24} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vrijednost Prodajnog Kanala</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatCurrency(performance.pipeline_value)}
                </p>
              </div>
              <div className="bg-yellow-500 p-4 rounded-lg text-white">
                <FiDollarSign size={24} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Dobivena Vrijednost</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatCurrency(performance.won_value)}
                </p>
              </div>
              <div className="bg-purple-500 p-4 rounded-lg text-white">
                <FiDollarSign size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grafikon Prodajnog Kanala */}
      <div className="card overflow-hidden p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white sm:mb-6 sm:text-xl">Izvještaj Prodajnog Kanala</h2>
        <div className="space-y-4">
          {funnel.map((stage) => {
            const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            return (
              <div key={stage.stage_key} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: getStageColor(stage.stage_key) }}
                    ></div>
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getStageName(stage.stage_key, stage.stage)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stage.count} deal-ova
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatCurrency(stage.estimated_revenue)}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getStageColor(stage.stage_key),
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalji Performansi */}
      {performance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stanje Deal-ova</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-gray-600 dark:text-gray-400">Otvoreni</span>
                <span className="shrink-0 font-semibold text-gray-900 dark:text-white">{performance.open_deals}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-gray-600 dark:text-gray-400">Dobiveni</span>
                <span className="shrink-0 font-semibold text-green-600 dark:text-green-400">{performance.won_deals}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-gray-600 dark:text-gray-400">Izgubljeni</span>
                <span className="shrink-0 font-semibold text-red-600 dark:text-red-400">{performance.lost_deals}</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financijski Pregled</h2>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-gray-600 dark:text-gray-400">Ukupna Vrijednost</span>
                <span className="shrink-0 text-right font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(performance.total_value)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-gray-600 dark:text-gray-400">Vrijednost Prodajnog Kanala</span>
                <span className="shrink-0 text-right font-semibold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(performance.pipeline_value)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-gray-600 dark:text-gray-400">Dobivena Vrijednost</span>
                <span className="shrink-0 text-right font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(performance.won_value)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
