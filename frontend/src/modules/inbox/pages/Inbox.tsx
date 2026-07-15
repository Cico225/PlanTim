import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { 
  FiMail, 
  FiSend, 
  FiArchive, 
  FiTrash2, 
  FiInbox, 
  FiCornerUpLeft,
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiPaperclip,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiStar,
  FiX,
  FiPlus
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface InboxMessage {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  parent_id: number | null;
  created_at: string;
  sender_name: string;
  sender_email: string;
  sender_avatar?: string;
  recipient_name: string;
  recipient_email: string;
  attachments_count: number;
  attachments?: any[];
  thread?: any[];
}

interface Recipient {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface Role {
  id: number;
  name: string;
  display_name?: string;
}

type FilterType = 'inbox' | 'sent' | 'archived' | 'all';
type RecipientType = 'user' | 'role';

export default function Inbox() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { messageId } = useParams();
  const { user } = useAuthStore();
  
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('inbox');
  const [canSend, setCanSend] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Compose form state
  const [recipientType, setRecipientType] = useState<RecipientType>('user');
  const [composeData, setComposeData] = useState({
    recipient_id: '',
    role_id: '',
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
  });
  
  // Reply form state
  const [replyMessage, setReplyMessage] = useState('');

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.get<any>('/inbox', { filter });
      setMessages(data.data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error(t('inbox.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  const checkSendPermission = async () => {
    try {
      const data = await apiService.get<{ can_send: boolean }>('/inbox/can-send');
      setCanSend(data.can_send);
    } catch (error) {
      setCanSend(false);
    }
  };

  const loadRecipients = async () => {
    try {
      const data = await apiService.get<Recipient[]>('/inbox/recipients');
      setRecipients(data || []);
    } catch (error) {
      console.error('Failed to load recipients:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await apiService.get<Role[]>('/inbox/roles');
      setRoles(data || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadMessage = async (id: number) => {
    try {
      const data = await apiService.get<InboxMessage>(`/inbox/${id}`);
      setSelectedMessage(data);
    } catch (error) {
      console.error('Failed to load message:', error);
      toast.error(t('inbox.messageLoadError'));
    }
  };

  useEffect(() => {
    loadMessages();
    checkSendPermission();
    loadRecipients();
    loadRoles();
  }, [loadMessages]);

  // Check if we're on the compose route
  useEffect(() => {
    if (location.pathname === '/inbox/compose' && canSend) {
      setShowCompose(true);
    }
  }, [location.pathname, canSend]);

  useEffect(() => {
    if (messageId) {
      loadMessage(parseInt(messageId));
    } else {
      setSelectedMessage(null);
    }
  }, [messageId]);

  const handleSelectMessage = (message: InboxMessage) => {
    navigate(`/inbox/${message.id}`);
  };

  const handleBackToList = () => {
    navigate('/inbox');
    setSelectedMessage(null);
    setShowReply(false);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiService.put(`/inbox/${id}/read`, {});
      setMessages(prev => prev.map(m => 
        m.id === id ? { ...m, is_read: true } : m
      ));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, is_read: true } : null);
      }
    } catch (error) {
      toast.error(t('inbox.markReadError'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.put('/inbox/mark-all-read', {});
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      toast.success(t('inbox.allMarkedRead'));
    } catch (error) {
      toast.error(t('inbox.markAllReadError'));
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await apiService.put(`/inbox/${id}/archive`, {});
      // Reload messages to ensure consistency with backend
      await loadMessages();
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
        navigate('/inbox');
      }
      toast.success(t('inbox.messageArchived'));
    } catch (error) {
      toast.error(t('inbox.archiveError'));
    }
  };

  const handleUnarchive = async (id: number) => {
    try {
      await apiService.put(`/inbox/${id}/unarchive`, {});
      loadMessages();
      toast.success(t('inbox.unarchived'));
    } catch (error) {
      toast.error(t('inbox.unarchiveError'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('inbox.confirmDelete'))) return;
    
    try {
      await apiService.delete(`/inbox/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
        navigate('/inbox');
      }
      toast.success(t('inbox.deleted'));
    } catch (error) {
      toast.error(t('inbox.deleteError'));
    }
  };

  const handleCloseCompose = () => {
    setShowCompose(false);
    setRecipientType('user');
    setComposeData({ recipient_id: '', role_id: '', subject: '', message: '', priority: 'normal' });
    if (location.pathname === '/inbox/compose') {
      navigate('/inbox');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasRecipient = recipientType === 'user' ? composeData.recipient_id : composeData.role_id;
    
    if (!hasRecipient || !composeData.subject || !composeData.message) {
      toast.error(t('inbox.fillAllFields'));
      return;
    }

    try {
      const payload = {
        subject: composeData.subject,
        message: composeData.message,
        priority: composeData.priority,
        recipient_type: recipientType,
        ...(recipientType === 'user' 
          ? { recipient_id: composeData.recipient_id }
          : { role_id: composeData.role_id }
        ),
      };
      
      await apiService.post('/inbox/send', payload);
      toast.success(recipientType === 'role' 
        ? t('inbox.messageSentToRole') 
        : t('inbox.messageSent')
      );
      handleCloseCompose();
      loadMessages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('inbox.sendError'));
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyMessage.trim() || !selectedMessage) {
      toast.error(t('inbox.enterMessage'));
      return;
    }

    try {
      await apiService.post(`/inbox/${selectedMessage.id}/reply`, { message: replyMessage });
      toast.success(t('inbox.replySent'));
      setReplyMessage('');
      setShowReply(false);
      loadMessages();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('inbox.replyError'));
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const filteredMessages = messages.filter(m => 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.recipient_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filterTabs = [
    { key: 'inbox' as FilterType, label: t('inbox.inbox'), icon: FiInbox },
    { key: 'sent' as FilterType, label: t('inbox.sent'), icon: FiSend },
    { key: 'archived' as FilterType, label: t('inbox.archived'), icon: FiArchive },
  ];

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - Mobile Responsive */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {selectedMessage && (
              <button
                onClick={handleBackToList}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiMail className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="truncate">{t('inbox.title')}</span>
                {unreadCount > 0 && (
                  <span className="flex-shrink-0 px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 hidden sm:block">
                {t('inbox.subtitle')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {canSend ? (
              <button
                onClick={() => setShowCompose(true)}
                className="btn-primary flex items-center gap-1 sm:gap-2 text-sm px-3 py-2"
              >
                <FiPlus className="w-4 h-4 sm:hidden" />
                <FiSend className="w-4 h-4 hidden sm:block" />
                <span className="hidden sm:inline">{t('inbox.compose')}</span>
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <FiAlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-700 dark:text-amber-300">{t('inbox.readOnly')}</span>
              </div>
            )}
            
            {!selectedMessage && (
              <button
                onClick={handleMarkAllAsRead}
                className="p-2 sm:px-3 sm:py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('inbox.markAllRead')}
              >
                <FiCheckCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="hidden sm:inline ml-2 text-sm">{t('inbox.markAllRead')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Filter Tabs - Mobile: Horizontal scroll, Desktop: Sidebar */}
        {!selectedMessage && (
          <>
            {/* Mobile Filter Tabs */}
            <div className="sm:hidden flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto scrollbar-hide">
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      filter === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden sm:block w-48 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
            <nav className="space-y-1">
              {filterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          </>
        )}

        {/* Message List or Detail */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800 sm:bg-transparent">
          {!selectedMessage ? (
            <>
              {/* Search */}
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={t('inbox.search')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-gray-500 dark:text-gray-400">
                    <FiMail className="w-12 h-12 sm:w-16 sm:h-16 mb-4 text-gray-300 dark:text-gray-600" />
                    <p className="text-base sm:text-lg font-medium text-center">{t('inbox.noMessages')}</p>
                    <p className="text-sm text-center mt-1">
                      {filter === 'sent' 
                        ? t('inbox.noMessagesDescSent')
                        : filter === 'archived'
                        ? t('inbox.noMessagesDescArchived')
                        : t('inbox.noMessagesDesc')
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredMessages.map(message => (
                      <div
                        key={message.id}
                        onClick={() => handleSelectMessage(message)}
                        className={`p-3 sm:p-4 cursor-pointer transition-colors active:bg-gray-100 dark:active:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          !message.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {(filter === 'sent' ? message.recipient_name : message.sender_name)?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className={`font-medium truncate text-sm sm:text-base ${
                                !message.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {filter === 'sent' ? message.recipient_name : message.sender_name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`truncate text-sm ${
                                !message.is_read 
                                  ? 'font-semibold text-gray-900 dark:text-white' 
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {message.subject}
                              </span>
                            </div>
                            
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                              {message.message?.substring(0, 80)}...
                            </p>
                            
                            {/* Tags Row */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {message.priority !== 'normal' && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(message.priority)}`}>
                                  {t(`inbox.priority.${message.priority}`)}
                                </span>
                              )}
                              {message.attachments_count > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                  <FiPaperclip className="w-3 h-3" />
                                  {message.attachments_count}
                                </span>
                              )}
                              {!message.is_read && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Message Detail View - Full screen on mobile */
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-4 sm:p-6">
                {/* Message Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">
                      {selectedMessage.subject}
                    </h2>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {selectedMessage.priority !== 'normal' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(selectedMessage.priority)}`}>
                          {t(`inbox.priority.${selectedMessage.priority}`)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sender Info */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm sm:text-base">
                        {selectedMessage.sender_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {selectedMessage.sender_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {selectedMessage.sender_email}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {format(new Date(selectedMessage.created_at), 'PPpp')}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons - Mobile friendly */}
                  <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleArchive(selectedMessage.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <FiArchive className="w-4 h-4" />
                      <span className="sm:inline">{t('inbox.archive')}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(selectedMessage.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      <span className="sm:inline">{t('inbox.delete')}</span>
                    </button>
                  </div>

                  {/* Message Body */}
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedMessage.message}
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <FiPaperclip className="w-4 h-4" />
                        {t('inbox.attachments')} ({selectedMessage.attachments.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedMessage.attachments.map((attachment: any) => (
                          <a
                            key={attachment.id}
                            href={attachment.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                          >
                            <FiPaperclip className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate max-w-[150px] sm:max-w-none">{attachment.file_name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reply Section */}
                {selectedMessage.sender_id !== user?.id && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                    {canSend ? (
                      !showReply ? (
                        <button
                          onClick={() => setShowReply(true)}
                          className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2"
                        >
                          <FiCornerUpLeft className="w-4 h-4" />
                          {t('inbox.reply')}
                        </button>
                      ) : (
                        <form onSubmit={handleReply}>
                          <textarea
                            value={replyMessage}
                            onChange={e => setReplyMessage(e.target.value)}
                            placeholder={t('inbox.typeReply')}
                            rows={4}
                            className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                            autoFocus
                          />
                          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowReply(false);
                                setReplyMessage('');
                              }}
                              className="btn-secondary w-full sm:w-auto justify-center"
                            >
                              {t('common.cancel')}
                            </button>
                            <button type="submit" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
                              <FiSend className="w-4 h-4" />
                              {t('inbox.sendReply')}
                            </button>
                          </div>
                        </form>
                      )
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('inbox.readOnlyDesc')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('inbox.contactAdmin')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal - Full screen on mobile */}
      {showCompose && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gray-500/75 dark:bg-gray-900/75" onClick={handleCloseCompose} />
            
          <div className="absolute inset-0 sm:inset-4 sm:top-auto sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-2xl sm:max-h-[90vh] sm:my-8">
            <div className="h-full bg-white dark:bg-gray-800 sm:rounded-xl shadow-xl flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FiSend className="w-5 h-5" />
                  {t('inbox.newMessage')}
                </h3>
                <button
                  onClick={handleCloseCompose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <form onSubmit={handleSendMessage} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Recipient Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('inbox.recipientType')}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          value="user"
                          checked={recipientType === 'user'}
                          onChange={() => {
                            setRecipientType('user');
                            setComposeData(prev => ({ ...prev, role_id: '' }));
                          }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t('inbox.singleUser')}
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          value="role"
                          checked={recipientType === 'role'}
                          onChange={() => {
                            setRecipientType('role');
                            setComposeData(prev => ({ ...prev, recipient_id: '' }));
                          }}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {t('inbox.allUsersInRole')}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Recipient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {recipientType === 'user' ? t('inbox.recipient') : t('inbox.selectRole')}
                  </label>
                    {recipientType === 'user' ? (
                  <select
                    value={composeData.recipient_id}
                    onChange={e => setComposeData(prev => ({ ...prev, recipient_id: e.target.value }))}
                        className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('inbox.selectRecipient')}</option>
                    {recipients.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                    ))}
                  </select>
                    ) : (
                      <select
                        value={composeData.role_id}
                        onChange={e => setComposeData(prev => ({ ...prev, role_id: e.target.value }))}
                        className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">{t('inbox.selectRoleOption')}</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.display_name || r.name}
                          </option>
                        ))}
                      </select>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('inbox.subject')}
                  </label>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('inbox.priority.label')}
                  </label>
                  <select
                    value={composeData.priority}
                    onChange={e => setComposeData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">{t('inbox.priority.low')}</option>
                    <option value="normal">{t('inbox.priority.normal')}</option>
                    <option value="high">{t('inbox.priority.high')}</option>
                    <option value="urgent">{t('inbox.priority.urgent')}</option>
                  </select>
                </div>

                  <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('inbox.message')}
                  </label>
                  <textarea
                    value={composeData.message}
                    onChange={e => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                      rows={6}
                      className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                  />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    type="button"
                    onClick={handleCloseCompose}
                    className="btn-secondary w-full sm:w-auto justify-center"
                  >
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2">
                    <FiSend className="w-4 h-4" />
                    {t('inbox.send')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
