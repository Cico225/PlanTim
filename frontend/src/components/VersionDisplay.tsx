import { useAppVersion } from '@/hooks/useAppVersion';
import { FiInfo, FiAlertCircle } from 'react-icons/fi';
import { useState, useEffect } from 'react';

interface VersionDisplayProps {
  className?: string;
  showUpdateBadge?: boolean;
}

export default function VersionDisplay({ 
  className = '', 
  showUpdateBadge = true 
}: VersionDisplayProps) {
  const { version, loading, checkForUpdates } = useAppVersion();
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (showUpdateBadge && version?.version) {
      checkUpdate();
    }
  }, [version?.version, showUpdateBadge]);

  const checkUpdate = async () => {
    try {
      setChecking(true);
      const latest = await checkForUpdates();
      if (latest && latest.is_update_available) {
        setUpdateInfo(latest);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  if (loading || !version) {
    return (
      <div className={`text-xs text-gray-400 dark:text-gray-500 ${className}`}>
        v1.0.0
      </div>
    );
  }

  // Check if className contains text-white or white color (for sidebar)
  const isWhiteText = className?.includes('text-white') || className?.includes('white');
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1.5 text-xs ${isWhiteText ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
        {!isWhiteText && <FiInfo size={12} />}
        <span>v{version.version}</span>
        {version.version_name && (
          <span className={isWhiteText ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}>
            - {version.version_name}
          </span>
        )}
      </div>
      
      {showUpdateBadge && updateInfo && (
        <div 
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          title={`Nova verzija dostupna: v${updateInfo.version}`}
        >
          <FiAlertCircle size={12} />
          <span>Update</span>
        </div>
      )}
    </div>
  );
}

