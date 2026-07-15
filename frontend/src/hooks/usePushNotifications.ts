import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  loading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    loading: true,
    error: null,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported = 
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    
    return isSupported;
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      if (!('serviceWorker' in navigator)) {
        console.log('[Push] Service Worker not supported');
        return null;
      }

      // Check if already registered
      const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (existingRegistration) {
        console.log('[Push] Using existing service worker registration');
        return existingRegistration;
      }

      // Register new service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('[Push] Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error);
      return null;
    }
  }, []);

  // Get current subscription
  const getSubscription = useCallback(async (registration: ServiceWorkerRegistration) => {
    try {
      const subscription = await registration.pushManager.getSubscription();
      return subscription;
    } catch (error) {
      console.error('[Push] Failed to get subscription:', error);
      return null;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          loading: false,
          error: 'Korisnik nije dozvolio notifikacije'
        }));
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Nije moguće registrovati service worker'
        }));
        return false;
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const vapidResponse = await apiService.get<{ public_key: string; supported: boolean }>('/push/vapid-key');
      
      if (!vapidResponse.supported || !vapidResponse.public_key) {
        // VAPID not configured - use fallback polling
        console.log('[Push] VAPID not configured, using polling fallback');
        
        // Still subscribe to show notifications via polling
        await apiService.post('/push/subscribe', {
          subscription: {
            endpoint: 'polling-' + Date.now(),
            keys: {
              p256dh: 'polling',
              auth: 'polling'
            }
          }
        });

        setState(prev => ({
          ...prev,
          isSubscribed: true,
          permission: 'granted',
          loading: false
        }));
        return true;
      }

      // Convert VAPID key to Uint8Array
      const vapidPublicKey = urlBase64ToUint8Array(vapidResponse.public_key);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      console.log('[Push] Subscribed:', subscription);

      // Send subscription to server
      await apiService.post('/push/subscribe', {
        subscription: subscription.toJSON()
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        loading: false
      }));

      return true;
    } catch (error: any) {
      console.error('[Push] Subscribe failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Greška pri pretplati na notifikacije'
      }));
      return false;
    }
  }, [registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Unsubscribe from push manager
          await subscription.unsubscribe();
          
          // Notify server
          await apiService.post('/push/unsubscribe', {
            endpoint: subscription.endpoint
          });
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        loading: false
      }));

      return true;
    } catch (error: any) {
      console.error('[Push] Unsubscribe failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Greška pri odjavi od notifikacija'
      }));
      return false;
    }
  }, []);

  // Test push notification
  const sendTest = useCallback(async () => {
    try {
      await apiService.post('/push/test');
      return true;
    } catch (error) {
      console.error('[Push] Test failed:', error);
      return false;
    }
  }, []);

  // Check subscription status on mount
  useEffect(() => {
    const init = async () => {
      const isSupported = checkSupport();
      
      if (!isSupported) {
        setState({
          isSupported: false,
          isSubscribed: false,
          permission: 'unsupported',
          loading: false,
          error: null
        });
        return;
      }

      const permission = Notification.permission;
      
      // Check if subscribed
      let isSubscribed = false;
      if (permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/sw.js');
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            isSubscribed = !!subscription;
          }
        } catch (error) {
          console.error('[Push] Error checking subscription:', error);
        }
      }

      setState({
        isSupported: true,
        isSubscribed,
        permission,
        loading: false,
        error: null
      });
    };

    init();
  }, [checkSupport]);

  // Listen for messages from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        // Navigate to the URL from the notification
        window.location.href = event.data.url;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTest
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePushNotifications;


