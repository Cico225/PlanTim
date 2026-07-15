import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInboxCount } from '../hooks/useInboxCount';
import { apiService } from '@/services/api';
import { FiMail, FiSend, FiAlertCircle } from 'react-icons/fi';

interface InboxMessage {
  id: number;
  subject: string;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  sender_name: string;
  sender_avatar?: string;
}

export default function InboxBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { unreadCount, decrementCount } = useInboxCount();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canSend, setCanSend] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user can send messages
    checkSendPermission();
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadRecentMessages();
    }
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

  const checkSendPermission = async () => {
    try {
      const data = await apiService.get<{ can_send: boolean }>('/inbox/can-send');
      setCanSend(data.can_send);
    } catch (error) {
      console.error('Failed to check send permission:', error);
      setCanSend(false);
    }
  };

  const loadRecentMessages = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<InboxMessage[]>('/inbox/recent');
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load recent messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async (message: InboxMessage) => {
    if (!message.is_read) {
      try {
        await apiService.put(`/inbox/${message.id}/read`, {});
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, is_read: true } : msg
        ));
        decrementCount();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    }
    
    setIsOpen(false);
    navigate(`/inbox/${message.id}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'low':
        return 'text-gray-400';
      default:
        return 'text-blue-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'high') {
      return <FiAlertCircle className={`w-3 h-3 ${getPriorityColor(priority)}`} />;
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Envelope Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        title={t('inbox.title')}
      >
        <FiMail className="w-6 h-6" />
        
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
          
          <div className="fixed inset-x-2 top-16 bottom-auto sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] sm:max-h-[500px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiMail className="w-5 h-5" />
                {t('inbox.title')}
              </h3>
              <div className="flex items-center gap-2">
                {canSend && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/inbox/compose');
                    }}
                    className="p-2 sm:p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title={t('inbox.compose')}
                  >
                    <FiSend className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                )}
                <Link
                  to="/inbox"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  {t('inbox.viewAll')}
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

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <FiMail className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('inbox.noMessages')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleMessageClick(message)}
                    className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors active:bg-gray-100 dark:active:bg-gray-600 min-h-[60px] ${
                      !message.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {message.sender_avatar ? (
                          <img 
                            src={message.sender_avatar} 
                            alt={message.sender_name}
                            className="w-10 h-10 sm:w-10 sm:h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {message.sender_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium truncate ${
                            message.is_read 
                              ? 'text-gray-700 dark:text-gray-300' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {message.sender_name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {getPriorityIcon(message.priority)}
                            {!message.is_read && (
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className={`text-sm truncate ${
                          message.is_read 
                            ? 'text-gray-600 dark:text-gray-400' 
                            : 'text-gray-800 dark:text-gray-200 font-medium'
                        }`}>
                          {message.subject}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(message.created_at), { 
                            addSuffix: true
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {messages.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <Link
                to="/inbox"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 py-2 min-h-[44px] flex items-center justify-center"
              >
                {t('inbox.viewAll')}
              </Link>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}

