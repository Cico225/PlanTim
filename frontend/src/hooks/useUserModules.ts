import { useState, useEffect, useCallback } from 'react';

interface UserModule {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  route: string;
  is_active: boolean;
  is_plugin: boolean;
  sort_order: number;
}

export const useUserModules = () => {
  const [modules, setModules] = useState<UserModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserModules = useCallback(async (retryCount = 0) => {
      const maxRetry = 2;
      const retryDelayMs = 1500;
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/accessible-modules', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 429 && retryCount < maxRetry) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
          return fetchUserModules(retryCount + 1);
        }

        if (response.ok) {
          const data = await response.json();
          setModules(Array.isArray(data) ? data : []);
          setError(null);
        } else {
          setModules([]);
          setError(null);
        }
        setLoading(false);
      } catch (err) {
        setModules([]);
        setError(null);
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchUserModules();
  }, [fetchUserModules]);

  return { modules, loading, error, refetch: fetchUserModules };
};
