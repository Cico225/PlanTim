import { useAppVersion } from '@/hooks/useAppVersion';
import { FiInfo } from 'react-icons/fi';
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
  const [updateInfo, setUpdateInfo] = useState<{ version?: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hasUnseenVersion, setHasUnseenVersion] = useState(false);

  useEffect(() => {
    if (!version?.version) return;
    setHasUnseenVersion(getSeenVersion() !== version.version);
  }, [version?.version]);

  useEffect(() => {
    if (!showUpdateBadge || !version?.version) return;

    const checkUpdate = async () => {
      try {
        const latest = await checkForUpdates();
        if (latest?.is_update_available) {
          setUpdateInfo(latest);
        }
      } catch {
        // ignore
      }
    };

    checkUpdate();
  }, [version?.version, showUpdateBadge, checkForUpdates]);

  const markVersionSeen = useCallback((seenVersion: string) => {
    try {
      localStorage.setItem(SEEN_VERSION_KEY, seenVersion);
    } catch {
      // ignore
    }
    setHasUnseenVersion(false);
  }, []);

  const versionLabel = version?.version || (loading ? '…' : '1.0.0');
  const isWhiteText = className.includes('text-white') || className.includes('white');
  const showNewDot = hasUnseenVersion || Boolean(updateInfo);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
          isWhiteText
            ? 'text-white/85 hover:bg-white/15 hover:text-white'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-200'
        } ${className}`}
        title="Informacije o verziji"
        aria-label={`Verzija v${versionLabel}`}
      >
        <span className="relative inline-flex">
          <FiInfo size={13} />
          {showNewDot && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
          )}
        </span>
        <span>v{versionLabel}</span>
      </button>

      <VersionInfoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentVersion={version}
        onMarkSeen={markVersionSeen}
      />
    </>
  );
}
