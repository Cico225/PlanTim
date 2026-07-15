import { useState, useEffect } from 'react';
import {
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiActivity,
  FiClock,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';
import { apiService } from '@/services/api';

interface UserDetailsModalProps {
  user: any;
  onClose: () => void;
}

export default function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'permissions'>('info');
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivityLog();
    }
  }, [activeTab]);

  const fetchActivityLog = async () => {
    setLoadingActivity(true);
    try {
      // Implement activity log fetching
      setActivityLog([
        {
          id: 1,
          action: 'Prijava u sistem',
          timestamp: new Date().toISOString(),
          ip: '192.168.1.100',
        },
        {
          id: 2,
          action: 'Ažuriranje profila',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          ip: '192.168.1.100',
        },
      ]);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-600">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl sm:text-2xl font-bold flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{user.name}</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-dark-600 px-4 sm:px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Osnovne Informacije
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'activity'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Aktivnost
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3 sm:px-4 py-3 font-medium border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Dozvole
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                    user.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {user.is_active ? <FiCheckCircle /> : <FiXCircle />}
                  {user.is_active ? 'Aktivan' : 'Neaktivan'}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <FiMail size={16} />
                      Email
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">{user.email}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <FiPhone size={16} />
                      Telefon
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {user.phone || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <FiShield size={16} />
                      Uloga
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <FiCalendar size={16} />
                      Datum Kreiranja
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {formatDate(user.created_at)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <FiClock size={16} />
                      Poslednja Prijava
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {formatDate(user.last_login_at)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <FiUser size={16} />
                      ID Korisnika
                    </div>
                    <div className="text-gray-900 dark:text-white font-medium">{user.id}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              {loadingActivity ? (
                <div className="text-center py-8 text-gray-500">Učitavanje aktivnosti...</div>
              ) : activityLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nema zabeleženih aktivnosti</div>
              ) : (
                activityLog.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiActivity className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {activity.action}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatDate(activity.timestamp)} • IP: {activity.ip}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Dozvole Korisnika
                </h3>
                {user.permissions && user.permissions.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {user.permissions.map((permission: string, index: number) => (
                      <div
                        key={index}
                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-lg text-sm font-medium"
                      >
                        {permission}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    Korisnik nema dodeljene dozvole
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-dark-600">
          <button onClick={onClose} className="btn-secondary w-full sm:w-auto">
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
}


