import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiShield, 
  FiSettings, 
  FiActivity, 
  FiPackage,
  FiDatabase,
  FiLock,
  FiCpu,
  FiCloud
} from 'react-icons/fi';
import UserManagement from './UserManagement';
import ModuleManagement from './ModuleManagement';
import RolesManagement from './RolesManagement';
import SettingsManagement from './SettingsManagement';
import DatabaseBackup from './DatabaseBackup';
import SecurityManagement from './SecurityManagement';
import AIConfigManagement from './AIConfigManagement';
import Office365Overview from '../../office365/pages/Office365Overview';
import { apiService } from '../../../services/api';

interface SystemStats {
  total_users: number;
  active_sessions: number;
  uptime_days: number;
  uptime_formatted: string;
  database_size_mb: number;
  database_size_formatted: string;
  new_users_today: number;
  new_users_this_week: number;
  server_time: string;
}

export default function AdminOverview() {
  const { t } = useTranslation();
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🎯 AdminOverview - Current activeModule:', activeModule);

  // Fetch system statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiService.get<SystemStats>('/admin/stats');
        console.log('Admin stats received:', data);
        setStats(data);
      } catch (error) {
        console.error('Error fetching system stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const modules = [
    {
      id: 'users',
      name: 'Upravljanje Korisnicima',
      icon: FiUsers,
      description: 'Kreiranje, uređivanje i brisanje korisnika',
      color: 'blue',
    },
    {
      id: 'roles',
      name: 'Uloge i Dozvole',
      icon: FiShield,
      description: 'Upravljanje ulogama i RBAC sistemom',
      color: 'purple',
    },
    {
      id: 'settings',
      name: 'Sistemske Postavke',
      icon: FiSettings,
      description: 'Konfigurisanje sistema',
      color: 'gray',
    },
    {
      id: 'modules',
      name: 'Moduli i Plugini',
      icon: FiPackage,
      description: 'Upravljanje modulima',
      color: 'orange',
    },
    {
      id: 'database',
      name: 'Baza Podataka',
      icon: FiDatabase,
      description: 'Backup i restore',
      color: 'red',
    },
    {
      id: 'security',
      name: 'Sigurnost',
      icon: FiLock,
      description: 'GDPR i sigurnosne postavke',
      color: 'indigo',
    },
    {
      id: 'ai',
      name: 'AI Konfiguracija',
      icon: FiCpu,
      description: 'Postavke AI modula',
      color: 'pink',
    },
    {
      id: 'office365',
      name: 'Office 365 Integracija',
      icon: FiCloud,
      description: 'Microsoft Office 365 integracija',
      color: 'sky',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: any = {
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      gray: 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400',
      green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      pink: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
      sky: 'bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    };
    return colors[color] || colors.gray;
  };

  if (activeModule === 'users') {
    return (
      <div>
        <button
          onClick={() => setActiveModule('dashboard')}
          className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
        >
          ← Nazad na Administraciju
        </button>
        <UserManagement />
      </div>
    );
  }

  if (activeModule === 'modules') {
    console.log('🎯 Rendering ModuleManagement component');
    return (
      <div>
        <button
          onClick={() => setActiveModule('dashboard')}
          className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
        >
          ← Nazad na Administraciju
        </button>
        <ModuleManagement />
      </div>
    );
  }

  if (activeModule === 'roles') {
    console.log('🎯 Rendering RolesManagement component');
    return (
      <div>
        <button
          onClick={() => setActiveModule('dashboard')}
          className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
        >
          ← Nazad na Administraciju
        </button>
        <RolesManagement />
      </div>
    );
  }

  if (activeModule === 'settings') {
    console.log('🎯 Rendering SettingsManagement component');
    return (
      <div>
        <button
          onClick={() => setActiveModule('dashboard')}
          className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
        >
          ← Nazad na Administraciju
        </button>
        <SettingsManagement />
      </div>
    );
  }

  if (activeModule === 'database') {
    console.log('🎯 Rendering DatabaseBackup component');
    return (
      <div>
        <button
          onClick={() => setActiveModule('dashboard')}
          className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
        >
          ← Nazad na Administraciju
        </button>
        <DatabaseBackup />
      </div>
    );
  }

  if (activeModule === 'security') {
    console.log('🎯 Rendering SecurityManagement component');
    try {
      return (
        <div className="w-full">
          <button
            onClick={() => setActiveModule('dashboard')}
            className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
          >
            ← Nazad na Administraciju
          </button>
          <SecurityManagement />
        </div>
      );
    } catch (error: any) {
      console.error('Error rendering SecurityManagement:', error);
      return (
        <div className="w-full">
          <button
            onClick={() => setActiveModule('dashboard')}
            className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
          >
            ← Nazad na Administraciju
          </button>
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Greška</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Došlo je do greške pri učitavanju modula sigurnosti. Molimo osvežite stranicu.
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error?.message || 'Nepoznata greška'}</p>
          </div>
        </div>
      );
    }
  }

  if (activeModule === 'ai') {
    console.log('🎯 Rendering AIConfigManagement component');
    return (
      <div className="w-full">
        <button
          onClick={() => setActiveModule('dashboard')}
          className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
        >
          ← Nazad na Administraciju
        </button>
        <AIConfigManagement />
      </div>
    );
  }

  if (activeModule === 'office365') {
    console.log('🎯 Rendering Office365Overview component');
    return (
      <div className="w-full">
        <button
          onClick={() => setActiveModule('dashboard')}
          className="mb-4 text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
        >
          ← Nazad na Administraciju
        </button>
        <Office365Overview />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('admin.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Centralizovano upravljanje sistemom i svim modulima
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Korisnika</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats?.total_users || 0}
                  </p>
                  {stats && stats.new_users_today > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      +{stats.new_users_today} danas
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <FiUsers className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Aktivnih Sesija</p>
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.active_sessions || 0}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <FiActivity className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sistem Uptime</p>
              {loading ? (
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.uptime_formatted || '0 dana'}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <FiCpu className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">DB Veličina</p>
              {loading ? (
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats?.database_size_formatted || '0 MB'}
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <FiDatabase className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Administracija Moduli
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => {
                  console.log('🔄 Setting activeModule to:', module.id);
                  setActiveModule(module.id);
                }}
                className="card p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 text-left group"
              >
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${getColorClasses(
                    module.color
                  )}`}
                >
                  <Icon size={24} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {module.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{module.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Notice for other modules */}
      {activeModule !== 'dashboard' && 
       activeModule !== 'users' && 
       activeModule !== 'modules' && 
       activeModule !== 'roles' && 
       activeModule !== 'settings' && 
       activeModule !== 'activity' && 
       activeModule !== 'database' && 
       activeModule !== 'security' && 
       activeModule !== 'ai' && 
       activeModule !== 'office365' && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSettings className="text-primary-600 dark:text-primary-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {modules.find((m) => m.id === activeModule)?.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ovaj modul je trenutno u razvoju i biće dostupan uskoro.
          </p>
          <button onClick={() => setActiveModule('dashboard')} className="btn-primary">
            Nazad na Dashboard
          </button>
        </div>
      )}
    </div>
  );
}


