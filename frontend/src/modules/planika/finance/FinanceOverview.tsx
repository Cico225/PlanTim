import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiCreditCard, FiUpload, FiBarChart2, FiCamera, FiArrowLeft } from 'react-icons/fi';
import KreditiListPage from './pages/KreditiListPage';
import KreditiUploadPage from './pages/KreditiUploadPage';
import KreditiScanPage from './pages/KreditiScanPage';
import KreditiReportPage from './pages/KreditiReportPage';

type TabKey = 'list' | 'upload' | 'scan' | 'report';

const NAV: Array<{ key: TabKey; label: string; icon: typeof FiCreditCard; path: string }> = [
  { key: 'list', label: 'Pregled', icon: FiCreditCard, path: '/planika/finance/krediti' },
  { key: 'upload', label: 'Uvoz Excel', icon: FiUpload, path: '/planika/finance/krediti/upload' },
  { key: 'scan', label: 'Skeniranje', icon: FiCamera, path: '/planika/finance/krediti/scan' },
  { key: 'report', label: 'Izvještaj', icon: FiBarChart2, path: '/planika/finance/krediti/report' },
];

export default function FinanceOverview() {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('list');

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/upload')) setActiveTab('upload');
    else if (path.includes('/scan')) setActiveTab('scan');
    else if (path.includes('/report')) setActiveTab('report');
    else setActiveTab('list');
  }, [location]);

  const isScanTab = activeTab === 'scan';

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${isScanTab ? 'mb-2 sm:mb-4' : 'mb-4'}`}>
        <div>
          <p className={`uppercase tracking-wide text-gray-500 dark:text-gray-400 ${isScanTab ? 'hidden text-sm sm:block' : 'text-sm'}`}>
            {t('planika.title')}
          </p>
          <h1 className={`font-bold text-gray-900 dark:text-white ${isScanTab ? 'text-lg sm:text-3xl' : 'text-2xl sm:text-3xl'}`}>
            Krediti — Upravljanje administrativnim zabranama
          </h1>
          <p className={`text-gray-600 dark:text-gray-400 ${isScanTab ? 'hidden text-sm sm:mt-1 sm:block' : 'mt-1 text-sm'}`}>
            Pregled, uvoz, uparivanje zabrana i izvještaji
          </p>
        </div>
        <Link
          to="/planika/finance"
          className={`inline-flex items-center gap-1 font-medium text-primary-600 hover:underline dark:text-primary-400 ${isScanTab ? 'text-xs sm:text-sm' : 'text-sm'}`}
        >
          <FiArrowLeft size={16} />
          Finansije
        </Link>
      </div>

      <div className="shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <nav
          className={`grid grid-cols-2 gap-1.5 sm:flex sm:gap-0 sm:space-x-2 lg:space-x-4 ${isScanTab ? 'px-2 py-1.5 sm:px-4 sm:py-2' : 'px-3 py-2 sm:px-4'}`}
          aria-label="Finansije navigacija"
        >
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors touch-manipulation sm:flex-row sm:gap-2 sm:rounded-none sm:border-b-2 sm:bg-transparent sm:px-2 sm:py-3 sm:text-sm ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 sm:border-primary-500'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-400 sm:border-transparent sm:bg-transparent'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`min-h-0 flex-1 ${isScanTab ? 'overflow-hidden py-2 sm:overflow-y-auto sm:py-4' : 'overflow-y-auto py-4'}`}>
        <Routes>
          <Route index element={<KreditiListPage />} />
          <Route path="upload" element={<KreditiUploadPage />} />
          <Route path="scan" element={<KreditiScanPage />} />
          <Route path="report" element={<KreditiReportPage />} />
          <Route path="*" element={<Navigate to="/planika/finance/krediti" replace />} />
        </Routes>
      </div>
    </div>
  );
}
