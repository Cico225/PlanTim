import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface SecuritySettings {
  auto_logout_timeout?: {
    value: number;
  };
  session_lifetime?: {
    value: number;
  };
}

/**
 * Hook for handling automatic logout after inactivity
 */
export function useAutoLogout() {
  const { logout, isAuthenticated } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const settingsRef = useRef<number | null>(null);
  const settingsFetchedRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const timeoutMinutes = settingsRef.current;
    if (!timeoutMinutes || !isAuthenticated) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000; // Convert minutes to milliseconds

    timeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // Only logout if we're past the timeout
      if (timeSinceLastActivity >= timeoutMs) {
        toast.error(`Automatski logout zbog neaktivnosti (${timeoutMinutes} minuta)`);
        logout();
      }
    }, timeoutMs);
  }, [isAuthenticated, logout]);

  // Fetch auto logout timeout setting
  useEffect(() => {
    if (!isAuthenticated || settingsFetchedRef.current) {
      return;
    }

    const fetchSettings = async () => {
      try {
        // Use public endpoint (available to all authenticated users)
        const settings = await apiService.get<SecuritySettings>('/security/public-settings');
        // Use auto_logout_timeout if set and > 0, otherwise fall back to session_lifetime
        const autoLogoutTimeout = settings.auto_logout_timeout?.value;
        const sessionLifetime = settings.session_lifetime?.value;
        const timeout = (autoLogoutTimeout && autoLogoutTimeout > 0) ? autoLogoutTimeout : (sessionLifetime && sessionLifetime > 0 ? sessionLifetime : null);
        settingsRef.current = timeout;
        settingsFetchedRef.current = true;
        resetTimer();
      } catch (error) {
        // Silently fail - settings might not be accessible
        console.warn('Could not fetch auto logout settings:', error);
        settingsRef.current = null;
        settingsFetchedRef.current = true;
      }
    };

    fetchSettings();
  }, [isAuthenticated, resetTimer]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    resetTimer();
  }, [resetTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!isAuthenticated || !settingsFetchedRef.current || !settingsRef.current) {
      return;
    }

    // Events that count as activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Reset timer on initial load
    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAuthenticated, settingsFetchedRef.current, handleActivity, resetTimer]);

  // Reset fetched flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      settingsFetchedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isAuthenticated]);
}
