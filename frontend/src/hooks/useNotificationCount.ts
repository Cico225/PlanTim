import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { readStoredToken } from '@/services/authSession';

export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUnreadCount = async () => {
    try {
      const data = await apiService.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch (error) {
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!readStoredToken()) {
      setLoading(false);
      return;
    }

    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const decrementCount = () => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const resetCount = () => {
    setUnreadCount(0);
  };

  return {
    unreadCount,
    loading,
    refetch: fetchUnreadCount,
    decrementCount,
    resetCount,
  };
}


