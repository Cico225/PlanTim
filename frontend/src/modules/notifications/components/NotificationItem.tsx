import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClick?: (notification: Notification) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'inbox_message':
        return '✉️';
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

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'inbox_message':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'task_assignment':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'project_update':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'document_share':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'system_announcement':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'deadline_reminder':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    
    if (onClick) {
      onClick(notification);
    } else if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      className={`group relative p-4 border-l-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
        notification.is_read
          ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
          : 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getNotificationColor(notification.type)}`}>
            {getNotificationIcon(notification.type)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${
                notification.is_read 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-900 dark:text-white font-semibold'
              }`}>
                {notification.title}
              </h3>
              <p className={`mt-1 text-sm ${
                notification.is_read 
                  ? 'text-gray-600 dark:text-gray-400' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {notification.message}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(notification.created_at), { 
                addSuffix: true
              })}
              </p>
            </div>

            {/* Unread indicator */}
            {!notification.is_read && (
              <div className="flex-shrink-0 ml-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        {/* Actions (show on hover) */}
        <div className="absolute top-2 right-2 hidden group-hover:flex space-x-1">
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Mark as read"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
