import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FiHome, FiUsers, FiBriefcase, FiDollarSign, FiActivity, 
  FiBarChart2, FiClock, FiTag
} from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import CRMDashboard from '../components/CRMDashboard';
import AccountsList from '../components/AccountsList';
import ContactsList from '../components/ContactsList';
import DealsList from '../components/DealsList';
import ActivitiesList from '../components/ActivitiesList';
import CRMReports from '../components/CRMReports';

type TabKey = 'dashboard' | 'accounts' | 'contacts' | 'deals' | 'activities' | 'reports';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
}

export default function CRMOverview() {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  const navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: FiHome, path: '/crm' },
    { key: 'accounts', label: 'Kompanije', icon: FiBriefcase, path: '/crm/accounts' },
    { key: 'contacts', label: 'Kontakti', icon: FiUsers, path: '/crm/contacts' },
    { key: 'deals', label: 'Deal-ovi', icon: FiDollarSign, path: '/crm/deals' },
    { key: 'activities', label: 'Aktivnosti', icon: FiActivity, path: '/crm/activities' },
    { key: 'reports', label: 'Izvještaji', icon: FiBarChart2, path: '/crm/reports' },
  ];

  useEffect(() => {
    // Odredi aktivni tab na osnovu lokacije
    const path = location.pathname;
    if (path === '/crm' || path === '/crm/') {
      setActiveTab('dashboard');
    } else if (path.startsWith('/crm/accounts')) {
      setActiveTab('accounts');
    } else if (path.startsWith('/crm/contacts')) {
      setActiveTab('contacts');
    } else if (path.startsWith('/crm/deals')) {
      setActiveTab('deals');
    } else if (path.startsWith('/crm/activities')) {
      setActiveTab('activities');
    } else if (path.startsWith('/crm/reports')) {
      setActiveTab('reports');
    }
  }, [location]);

  return (
    <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
      {/* Tab Navigation */}
      <div className="shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <nav
          className="grid grid-cols-3 gap-1.5 px-3 py-2 sm:flex sm:gap-0 sm:space-x-4 sm:px-6 sm:py-0 lg:space-x-8 lg:px-8"
          aria-label="Tabs"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors touch-manipulation
                  sm:flex-row sm:gap-2 sm:rounded-none sm:border-b-2 sm:bg-transparent sm:px-1 sm:py-4 sm:text-sm
                  ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 sm:border-primary-500'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-800 sm:border-transparent sm:bg-transparent sm:text-gray-500 sm:hover:text-gray-700 dark:sm:hover:text-gray-300'
                  }
                `}
              >
                <Icon size={16} className="shrink-0 sm:h-[18px] sm:w-[18px]" />
                <span className="max-w-full truncate leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <Routes>
          <Route index element={<CRMDashboard />} />
          <Route path="accounts/*" element={<AccountsList />} />
          <Route path="contacts/*" element={<ContactsList />} />
          <Route path="deals/*" element={<DealsList />} />
          <Route path="activities/*" element={<ActivitiesList />} />
          <Route path="reports/*" element={<CRMReports />} />
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </div>
    </div>
  );
}
