import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiFileText, FiDownload } from 'react-icons/fi';
import { OverviewReport, RegionReport, StoreReport, EmployeeReport } from '@/types/planika-maloprodaja';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'overview' | 'region' | 'store' | 'employee'>('overview');
  const [reportData, setReportData] = useState<any>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<number>(0);
  const [selectedStoreId, setSelectedStoreId] = useState<number>(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);

  useEffect(() => {
    loadReport();
  }, [reportType, selectedRegionId, selectedStoreId, selectedEmployeeId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      let url = `/planika/maloprodaja/reports?type=${reportType}`;
      
      if (reportType === 'region' && selectedRegionId) {
        url += `&region_id=${selectedRegionId}`;
      } else if (reportType === 'store' && selectedStoreId) {
        url += `&store_id=${selectedStoreId}`;
      } else if (reportType === 'employee' && selectedEmployeeId) {
        url += `&employee_id=${selectedEmployeeId}`;
      }

      const data = await apiService.get(url);
      setReportData(data);
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Greška pri učitavanju izvještaja');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate('/planika/retail')}
            className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block"
          >
            ← Maloprodaja
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Izvještaji</h1>
        </div>
      </div>

      {/* Report Type Selector - Mobile Responsive */}
      <div className="card p-3 sm:p-6">
        {/* Mobile: Horizontal scrollable tabs */}
        <div className="md:hidden overflow-x-auto scrollbar-hide -mx-3 px-3">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setReportType('overview')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors whitespace-nowrap min-w-[120px] ${
                reportType === 'overview'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FiFileText className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Pregled</span>
            </button>
            <button
              onClick={() => setReportType('region')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors whitespace-nowrap min-w-[120px] ${
                reportType === 'region'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FiFileText className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Po regiji</span>
            </button>
            <button
              onClick={() => setReportType('store')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors whitespace-nowrap min-w-[120px] ${
                reportType === 'store'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FiFileText className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Po prodavnici</span>
            </button>
            <button
              onClick={() => setReportType('employee')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors whitespace-nowrap min-w-[120px] ${
                reportType === 'employee'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FiFileText className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Po zaposleniku</span>
            </button>
          </div>
        </div>
        
        {/* Desktop: Grid layout */}
        <div className="hidden md:grid grid-cols-4 gap-4">
          <button
            onClick={() => setReportType('overview')}
            className={`p-4 rounded-lg border transition-colors ${
              reportType === 'overview'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <FiFileText className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium">Pregled</p>
          </button>
          <button
            onClick={() => setReportType('region')}
            className={`p-4 rounded-lg border transition-colors ${
              reportType === 'region'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <FiFileText className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium">Po regiji</p>
          </button>
          <button
            onClick={() => setReportType('store')}
            className={`p-4 rounded-lg border transition-colors ${
              reportType === 'store'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <FiFileText className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium">Po prodavnici</p>
          </button>
          <button
            onClick={() => setReportType('employee')}
            className={`p-4 rounded-lg border transition-colors ${
              reportType === 'employee'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <FiFileText className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
            <p className="text-sm font-medium">Po zaposleniku</p>
          </button>
        </div>
      </div>

      {/* Report Content */}
      {reportData && (
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {reportType === 'overview' && 'Pregled'}
              {reportType === 'region' && 'Izvještaj po regiji'}
              {reportType === 'store' && 'Izvještaj po prodavnici'}
              {reportType === 'employee' && 'Izvještaj po zaposleniku'}
            </h2>
            <button className="btn-secondary w-full sm:w-auto">
              <FiDownload className="w-4 h-4 mr-2" />
              Export PDF
            </button>
          </div>

          {reportType === 'overview' && reportData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Regije</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {reportData.total_regions || 0}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Prodavnice</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {reportData.total_stores || 0}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Aktivni planovi</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {reportData.active_plans || 0}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Kontrole</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {reportData.completed_controls || 0}
                </p>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg col-span-2 sm:col-span-1">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Ocjene</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {reportData.total_evaluations || 0}
                </p>
              </div>
            </div>
          )}

          {/* Add more report content here based on reportType */}
        </div>
      )}
    </div>
  );
}

