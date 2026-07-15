import { useState } from 'react';
import { FiBell, FiBellOff, FiSmartphone, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import toast from 'react-hot-toast';

interface PushNotificationToggleProps {
  compact?: boolean;
  showTest?: boolean;
}

export default function PushNotificationToggle({ compact = false, showTest = false }: PushNotificationToggleProps) {
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTest
  } = usePushNotifications();

  const [testLoading, setTestLoading] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success('Push notifikacije isključene');
      } else {
        toast.error('Greška pri isključivanju notifikacija');
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifikacije uključene!');
      } else if (permission === 'denied') {
        toast.error('Notifikacije su blokirane u postavkama preglednika');
      } else {
        toast.error(error || 'Greška pri uključivanju notifikacija');
      }
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    const success = await sendTest();
    setTestLoading(false);
    
    if (success) {
      toast.success('Test notifikacija poslana');
    } else {
      toast.error('Greška pri slanju test notifikacije');
    }
  };

  if (!isSupported) {
    if (compact) return null;
    
    return (
      <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-700 dark:text-yellow-300">
        <FiBellOff className="w-5 h-5" />
        <span className="text-sm">Push notifikacije nisu podržane u ovom pregledniku</span>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
          ${isSubscribed 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
            : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
          }
          ${loading ? 'opacity-50 cursor-wait' : ''}
        `}
        title={isSubscribed ? 'Push notifikacije uključene' : 'Uključi push notifikacije'}
      >
        {loading ? (
          <FiLoader className="w-5 h-5 animate-spin" />
        ) : isSubscribed ? (
          <FiBell className="w-5 h-5" />
        ) : (
          <FiBellOff className="w-5 h-5" />
        )}
        <span className="text-sm hidden sm:inline">
          {isSubscribed ? 'Uključeno' : 'Isključeno'}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-4">
          <div className={`
            p-3 rounded-full
            ${isSubscribed 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
              : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'
            }
          `}>
            <FiSmartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Push Notifikacije
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isSubscribed 
                ? 'Primate push notifikacije na ovom uređaju'
                : 'Uključite da primate obavijesti i kada niste na stranici'
              }
            </p>
            {permission === 'denied' && (
              <p className="text-sm text-red-500 mt-1">
                Notifikacije su blokirane u postavkama preglednika
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          className={`
            relative w-14 h-8 rounded-full transition-colors
            ${isSubscribed 
              ? 'bg-green-500' 
              : 'bg-gray-300 dark:bg-dark-600'
            }
            ${loading ? 'opacity-50 cursor-wait' : ''}
            ${permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span className={`
            absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform
            ${isSubscribed ? 'translate-x-6' : 'translate-x-0'}
          `}>
            {loading && (
              <FiLoader className="w-4 h-4 m-1 animate-spin text-gray-500" />
            )}
          </span>
        </button>
      </div>

      {showTest && isSubscribed && (
        <button
          onClick={handleTest}
          disabled={testLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
        >
          {testLoading ? (
            <FiLoader className="w-4 h-4 animate-spin" />
          ) : (
            <FiBell className="w-4 h-4" />
          )}
          Pošalji test notifikaciju
        </button>
      )}

      {/* Status indicators */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`
          flex items-center gap-1 px-2 py-1 rounded-full
          ${isSupported ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}
        `}>
          {isSupported ? <FiCheck className="w-3 h-3" /> : <FiX className="w-3 h-3" />}
          Browser podrška
        </span>
        <span className={`
          flex items-center gap-1 px-2 py-1 rounded-full
          ${permission === 'granted' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : permission === 'denied'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }
        `}>
          {permission === 'granted' ? <FiCheck className="w-3 h-3" /> : <FiX className="w-3 h-3" />}
          Dozvola: {permission === 'granted' ? 'Dozvoljeno' : permission === 'denied' ? 'Odbijeno' : 'Nije pitano'}
        </span>
      </div>
    </div>
  );
}


