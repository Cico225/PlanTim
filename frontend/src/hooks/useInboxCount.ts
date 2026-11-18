import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { readStoredToken } from '@/services/authSession';

export function useInboxCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await apiService.get<{ count: number }>('/inbox/unread-count');
      setUnreadCount(data.count || 0);
    } catch (error) {
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!readStoredToken()) {
      setLoading(false);
      return;
    }

    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const decrementCount = useCallback(() => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const refreshCount = useCallback(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  return {
    unreadCount,
    loading,
    decrementCount,
    resetCount,
    refreshCount,
  };
}

