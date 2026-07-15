import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '@/services/api';
import NotificationItem from '../components/NotificationItem';
import NotificationSettings from '../components/NotificationSettings';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  this_week: number;
  by_type: Record<string, number>;
}

export default function Notifications() {
  const { t } = useTranslation();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [filter]);

  const loadNotifications = async (page = 1, append = false) => {
    try {
      setLoading(true);
      
      const params: any = {
        page: page.toString(),
      };
      
      if (filter !== 'all') {
        params.is_read = filter === 'read' ? '1' : '0';
      }

      console.log('🔄 Loading notifications from API...', { page, filter, params });

      const data = await apiService.get<any>('/notifications', params);
      
      console.log('📦 Notifications API response:', data);
      console.log('📋 Notifications data:', data.data);
      console.log('📊 Pagination:', { current: data.current_page, last: data.last_page, total: data.total });
      
      if (!data || !data.data) {
        console.warn('⚠️ No data property in response:', data);
        setNotifications([]);
        return;
      }
      
      if (append) {
        setNotifications(prev => [...prev, ...data.data]);
      } else {
        setNotifications(data.data);
      }
      setHasMore(data.current_page < data.last_page);
      setCurrentPage(data.current_page);
      
      console.log('✅ Notifications loaded successfully:', data.data?.length || 0, 'notifications');
    } catch (error: any) {
      console.error('❌ Failed to load notifications:', error);
      console.error('Error details:', error.response?.data || error.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('🔄 Loading notification stats...');
      const data = await apiService.get<NotificationStats>('/notifications/stats');
      console.log('📊 Stats loaded:', data);
      setStats(data);
    } catch (error: any) {
      console.error('❌ Failed to load stats:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiService.put(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(notif => 
        notif.id === id ? { ...notif, is_read: true } : notif
      ));
      loadStats();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.put('/notifications/mark-all-read', {});
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      loadStats();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiService.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      loadStats();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleClearRead = async () => {
    try {
      await apiService.delete('/notifications/clear-read');
      setNotifications(prev => prev.filter(notif => !notif.is_read));
      loadStats();
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadNotifications(currentPage + 1, true);
    }
  };

  const filteredNotifications = notifications;
  
  // Debug log for filtered notifications
  useEffect(() => {
    console.log('📊 Notifications state updated:', {
      notifications: notifications.length,
      filteredNotifications: filteredNotifications.length,
      loading,
      filter,
    });
  }, [notifications, filteredNotifications, loading, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('notifications.title')}
          </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('notifications.all')}
        </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="btn-secondary flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{t('common.settings')}</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('notifications.total')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('notifications.unread')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.unread}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0V7a4 4 0 118 0v4z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('notifications.today')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.today}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('notifications.thisWeek')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.this_week}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions and Filters */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Filters */}
          <div className="flex space-x-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'read', label: 'Read' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setFilter(item.key as any);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === item.key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            {stats && stats.unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="btn-secondary text-sm"
              >
                Mark All Read
              </button>
            )}
            <button
              onClick={handleClearRead}
              className="btn-secondary text-sm"
            >
              Clear Read
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notifications
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'All caught up! No unread notifications.' : 'You have no notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
              />
            ))}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <NotificationSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}


