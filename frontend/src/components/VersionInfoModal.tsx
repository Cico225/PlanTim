import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FiX,
  FiCheck,
  FiStar,
  FiPackage,
  FiShield,
  FiDatabase,
  FiLayers,
  FiZap,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import type { AppVersion } from '@/hooks/useAppVersion';

interface VersionHistoryItem extends AppVersion {
  id?: number;
}

interface VersionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: AppVersion | null;
  onMarkSeen?: (version: string) => void;
}

const changeIcons = [FiZap, FiPackage, FiShield, FiDatabase, FiLayers, FiStar];

function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('bs-BA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function normalizeChangelog(changelog?: string[] | null): string[] {
  if (!changelog?.length) return [];
  return changelog.filter(Boolean);
}

export default function VersionInfoModal({
  isOpen,
  onClose,
  currentVersion,
  onMarkSeen,
}: VersionInfoModalProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (currentVersion?.version) {
      onMarkSeen?.(currentVersion.version);
    }

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await apiService.get<VersionHistoryItem[]>('/app-version/history');
        setHistory(Array.isArray(data) ? data : []);
      } catch {
        setHistory(currentVersion ? [currentVersion] : []);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [isOpen, currentVersion, onMarkSeen]);

  const primary = useMemo(() => {
    if (!history.length && currentVersion) return currentVersion;
    return history[0] ?? currentVersion;
  }, [history, currentVersion]);

  const changelog = normalizeChangelog(primary?.changelog);
  const olderVersions = history.slice(1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label={t('common.close')}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="version-info-title"
            className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-dark-800"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="relative overflow-hidden px-5 py-6 text-white sm:px-6">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-600"
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-indigo-300/20 blur-2xl"
                animate={{ scale: [1.1, 0.9, 1.1] }}
                transition={{ duration: 5, repeat: Infinity }}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <motion.p
                    className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    PlanTim
                  </motion.p>
                  <motion.h2
                    id="version-info-title"
                    className="text-2xl font-bold sm:text-[28px]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {t('version.whatsNew')}
                  </motion.h2>
                  <motion.div
                    className="mt-3 flex flex-wrap items-center gap-2.5"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25, type: 'spring' }}
                  >
                    <span className="rounded-xl bg-white/15 px-3 py-1.5 text-2xl font-black tracking-tight backdrop-blur-sm sm:text-3xl">
                      v{primary?.version ?? '1.0.0'}
                    </span>
                    {primary?.version_name && (
                      <span className="text-xs font-medium text-white/85 sm:text-sm">
                        {primary.version_name}
                      </span>
                    )}
                  </motion.div>
                  {primary?.released_at && (
                    <p className="mt-2 text-xs text-white/70 sm:text-sm">{formatDate(primary.released_at)}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/25"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {primary?.release_notes && (
                <motion.p
                  className="mb-4 rounded-xl bg-primary-50 px-4 py-3 text-[13px] leading-6 text-primary-900 dark:bg-primary-900/20 dark:text-primary-100"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {primary.release_notes}
                </motion.p>
              )}

              <div className="mb-3 flex items-center gap-2">
                <FiZap className="text-primary-500" size={16} />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200">
                  {t('version.changes')}
                </h3>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </div>
              ) : changelog.length > 0 ? (
                <ul className="space-y-2.5">
                  {changelog.map((item, index) => {
                    const Icon = changeIcons[index % changeIcons.length];
                    return (
                      <motion.li
                        key={`${item}-${index}`}
                        className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3 dark:border-dark-600 dark:bg-dark-900/40"
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + index * 0.08, type: 'spring', stiffness: 260 }}
                      >
                        <motion.span
                          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4 + index * 0.08, type: 'spring' }}
                        >
                          <Icon size={16} />
                        </motion.span>
                        <span className="text-[13px] leading-5 text-gray-700 dark:text-gray-200">
                          {item}
                        </span>
                        <FiCheck className="ml-auto mt-1 shrink-0 text-green-500" size={14} />
                      </motion.li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-[13px] text-gray-500 dark:border-dark-600 dark:text-gray-400">
                  {t('version.noChanges')}
                </p>
              )}

              {olderVersions.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                    {t('version.previousVersions')}
                  </h3>
                  <div className="space-y-2.5">
                    {olderVersions.map((entry, index) => (
                      <motion.div
                        key={entry.version}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.06 }}
                      >
                        <details className="group rounded-xl border border-gray-100 bg-white dark:border-dark-600 dark:bg-dark-900/20">
                          <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-gray-800 dark:text-gray-100">
                            <span className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] dark:bg-dark-700">
                              v{entry.version}
                              </span>
                              <span className="min-w-0 break-words">{entry.version_name || 'Verzija'}</span>
                              {entry.released_at && (
                                <span className="break-words text-[11px] font-normal text-gray-500 dark:text-gray-400">
                                  · {formatDate(entry.released_at)}
                                </span>
                              )}
                            </span>
                          </summary>
                          <div className="border-t border-gray-100 px-4 py-3 dark:border-dark-600">
                            {entry.release_notes && (
                              <p className="mb-2 text-[13px] leading-5 text-gray-600 dark:text-gray-300">
                                {entry.release_notes}
                              </p>
                            )}
                            <ul className="space-y-1.5">
                              {normalizeChangelog(entry.changelog).map((line, lineIndex) => (
                                <li
                                  key={`${entry.version}-${lineIndex}`}
                                  className="flex items-start gap-2 text-[13px] leading-5 text-gray-600 dark:text-gray-300"
                                >
                                  <FiCheck className="mt-0.5 shrink-0 text-green-500" size={12} />
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4 dark:border-dark-600 sm:px-6">
              <button type="button" onClick={onClose} className="btn-primary w-full">
                {t('version.gotIt')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
