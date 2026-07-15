import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface AppVersion {
  version: string;
  version_name?: string;
  released_at?: string;
  changelog?: string[];
  release_notes?: string;
  is_update_available?: boolean;
  current_version?: string;
}

export function useAppVersion() {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVersion();
    
    // Check for updates every 5 minutes
    const interval = setInterval(fetchVersion, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchVersion = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.get<AppVersion>('/app-version/current');
      setVersion(data);
    } catch (err: any) {
      // Silently fail - use fallback version
      // This endpoint might not exist yet, so we just use the env version
      setVersion({ version: import.meta.env.VITE_APP_VERSION || '1.0.0' });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async (): Promise<AppVersion | null> => {
    try {
      const data = await apiService.get<AppVersion>('/app-version/latest');
      return data;
    } catch (err: any) {
      // Silently fail for network errors
      if (err?.code !== 'ERR_NETWORK' && err?.message !== 'Network Error') {
        console.error('Error checking for updates:', err);
      }
      return null;
    }
  };

  return {
    version,
    loading,
    error,
    checkForUpdates,
    refresh: fetchVersion,
  };
}

