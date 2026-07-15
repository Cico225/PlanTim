import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotificationCount } from '../hooks/useNotificationCount';
import { apiService } from '@/services/api';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const { unreadCount, decrementCount, resetCount } = useNotificationCount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Remove the old useEffect for loadUnreadCount since we're using the hook now

  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      loadRecentNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Removed loadUnreadCount function since we're using the hook

  const loadRecentNotifications = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading recent notifications for bell...');
      const data = await apiService.get<any>('/notifications', { per_page: 5 });
      console.log('📦 Recent notifications response:', data);
      setNotifications(data.data || []);
      console.log('✅ Recent notifications loaded:', data.data?.length || 0, 'notifications');
    } catch (error: any) {
      console.error('❌ Failed to load recent notifications:', error);
      console.error('Error details:', error.response?.data || error.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      await apiService.put(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(notif => 
        notif.id === id ? { ...notif, is_read: true } : notif
      ));
      decrementCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    
    setIsOpen(false);
    
    if (notification.action_url) {
      // Handle internal routes
      if (notification.action_url.startsWith('/')) {
        window.location.href = notification.action_url;
      } else {
        window.open(notification.action_url, '_blank');
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chat_message':
        return '💬';
      case 'task_assignment':
        return '📋';
      case 'project_update':
        return '🔄';
      case 'document_share':
        return '📄';
      case 'system_announcement':
        return '📢';
      case 'user_mention':
        return '👤';
      case 'deadline_reminder':
        return '⏰';
      case 'approval_request':
        return '✋';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19H6.5A2.5 2.5 0 014 16.5v-7a7.5 7.5 0 1115 0v7a2.5 2.5 0 01-2.5 2.5H16" />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px] h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown - Mobile overlay */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 sm:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="fixed inset-x-2 top-16 bottom-auto sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] sm:max-h-[500px] flex flex-col">
          {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {t('notifications.title')}
            </h3>
              <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              {t('notifications.viewAll')}
            </Link>
                {/* Close button for mobile */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
          </div>

          {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('notifications.noNotifications')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors active:bg-gray-100 dark:active:bg-gray-600 min-h-[60px] ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-xl sm:text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              notification.is_read 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-900 dark:text-white font-semibold'
                            }`}>
                              {notification.title}
                            </p>
                            <p className={`mt-1 text-sm line-clamp-2 ${
                              notification.is_read 
                                ? 'text-gray-600 dark:text-gray-400' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {notification.message}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_at), { 
                                addSuffix: true
                              })}
                            </p>
                          </div>

                          {/* Unread indicator */}
                          {!notification.is_read && (
                            <div className="flex-shrink-0 ml-2">
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 py-2 min-h-[44px] flex items-center justify-center"
              >
                {t('notifications.viewAll')}
              </Link>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
