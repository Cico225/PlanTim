import { useAppVersion } from '@/hooks/useAppVersion';
import { FiInfo, FiAlertCircle } from 'react-icons/fi';
import { useCallback, useEffect, useState } from 'react';
import VersionInfoModal from '@/components/VersionInfoModal';

const SEEN_VERSION_KEY = 'plantim_seen_version';

interface VersionDisplayProps {
  className?: string;
  showUpdateBadge?: boolean;
}

function getSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_VERSION_KEY);
  } catch {
    return null;
  }
}

export default function VersionDisplay({
  className = '',
  showUpdateBadge = true,
}: VersionDisplayProps) {
  const { version, loading, checkForUpdates } = useAppVersion();
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasUnseenVersion, setHasUnseenVersion] = useState(false);

  useEffect(() => {
    if (!version?.version) return;
    setHasUnseenVersion(getSeenVersion() !== version.version);
  }, [version?.version]);

  useEffect(() => {
    if (showUpdateBadge && version?.version) {
      checkUpdate();
    }
  }, [version?.version, showUpdateBadge]);

  const checkUpdate = async () => {
    try {
      const latest = await checkForUpdates();
      if (latest?.is_update_available) {
        setUpdateInfo(latest);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const markVersionSeen = useCallback((seenVersion: string) => {
    try {
      localStorage.setItem(SEEN_VERSION_KEY, seenVersion);
    } catch {
      // ignore storage errors
    }
    setHasUnseenVersion(false);
  }, []);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  if (loading || !version) {
    return (
      <div className={`text-xs text-gray-400 dark:text-gray-500 ${className}`}>
        v1.0.0
      </div>
    );
  }

  const isWhiteText = className?.includes('text-white') || className?.includes('white');

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={openModal}
          className={`group relative inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-xs transition-colors ${
            isWhiteText
              ? 'text-white/80 hover:bg-white/10 hover:text-white'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-200'
          }`}
          title="Informacije o verziji i promjenama"
        >
          <span className="relative">
            <FiInfo size={14} className="transition-transform group-hover:scale-110" />
            {hasUnseenVersion && (
              <span className="absolute -right-1 -top-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
            )}
          </span>
          <span>v{version.version}</span>
          {version.version_name && (
            <span className={isWhiteText ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}>
              · {version.version_name}
            </span>
          )}
        </button>

        {showUpdateBadge && updateInfo && (
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            title={`Nova verzija dostupna: v${updateInfo.version}`}
          >
            <FiAlertCircle size={12} />
            <span>Update</span>
          </button>
        )}
      </div>

      <VersionInfoModal
        isOpen={modalOpen}
        onClose={closeModal}
        currentVersion={version}
        onMarkSeen={markVersionSeen}
      />
    </>
  );
}
