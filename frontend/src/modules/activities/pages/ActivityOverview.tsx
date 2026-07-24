import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiActivity,
  FiFilter,
  FiSearch,
  FiDownload,
  FiUser,
  FiClock,
  FiEye,
  FiX,
  FiCalendar,
  FiPlus,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import MeetingRoomCalendarCompact from '../components/MeetingRoomCalendarCompact';
import ActivityOverviewAnimation, { ActivityStatCard } from '../components/ActivityOverviewAnimation';

interface ActivityLog {
  id: number;
  log_name: string | null;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  properties: any;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  user_avatar: string | null;
}

interface ActivityFilters {
  type: string;
  user_id: string;
  subject_type: string;
  search: string;
  date_from: string;
  date_to: string;
}

type EventKind = 'create' | 'update' | 'delete' | 'other';

function getEventKind(description: string): EventKind {
  if (!description) return 'other';
  const descLower = description.toLowerCase();
  if (descLower.includes('created') || descLower.includes('create') || descLower.includes('kreirao')) {
    return 'create';
  }
  if (descLower.includes('updated') || descLower.includes('update') || descLower.includes('ažurirao') || descLower.includes('izmenio')) {
    return 'update';
  }
  if (descLower.includes('deleted') || descLower.includes('delete') || descLower.includes('obrisao')) {
    return 'delete';
  }
  return 'other';
}

const eventStyles: Record<
  EventKind,
  { bg: string; ring: string; icon: typeof FiPlus; iconClass: string }
> = {
  create: {
    bg: 'bg-green-100 dark:bg-green-900/25',
    ring: 'ring-green-200 dark:ring-green-800/50',
    icon: FiPlus,
    iconClass: 'text-green-600 dark:text-green-400',
  },
  update: {
    bg: 'bg-blue-100 dark:bg-blue-900/25',
    ring: 'ring-blue-200 dark:ring-blue-800/50',
    icon: FiEdit2,
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  delete: {
    bg: 'bg-red-100 dark:bg-red-900/25',
    ring: 'ring-red-200 dark:ring-red-800/50',
    icon: FiTrash2,
    iconClass: 'text-red-600 dark:text-red-400',
  },
  other: {
    bg: 'bg-gray-100 dark:bg-gray-700/60',
    ring: 'ring-gray-200 dark:ring-gray-600/50',
    icon: FiActivity,
    iconClass: 'text-gray-600 dark:text-gray-400',
  },
};

export default function ActivityOverview() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ActivityFilters>({
    type: '',
    user_id: '',
    subject_type: '',
    search: '',
    date_from: '',
    date_to: '',
  });
  const [availableFilters, setAvailableFilters] = useState<{
    types: string[];
    subject_types: string[];
  }>({
    types: [],
    subject_types: [],
  });
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('per_page', '50');

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await apiService.get(`/admin/activity-logs?${params.toString()}`);

      if (response && response.data) {
        setLogs(Array.isArray(response.data) ? response.data : []);
        setTotalPages(response.last_page || 1);
        setTotal(response.total || 0);

        if (response.filters) {
          setAvailableFilters({
            types: Array.isArray(response.filters.types) ? response.filters.types : [],
            subject_types: Array.isArray(response.filters.subject_types) ? response.filters.subject_types : [],
          });
        }
      } else if (Array.isArray(response)) {
        setLogs(response);
        setTotalPages(1);
        setTotal(response.length);
      } else {
        setLogs([]);
        setTotalPages(1);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      toast.error(error.response?.data?.message || 'Greška pri učitavanju logova aktivnosti');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      user_id: '',
      subject_type: '',
      search: '',
      date_from: '',
      date_to: '',
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  const exportLogs = () => {
    toast.success('Funkcionalnost izvoza logova će biti dodata uskoro');
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Pregled aktivnosti
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Pregled svih aktivnosti korisnika i sistema, te rezervacija sala za sastanke
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-primary-300 dark:ring-primary-700' : ''}`}
            >
              <FiFilter size={18} />
              {showFilters ? 'Sakrij filtere' : 'Filtriraj'}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button onClick={exportLogs} className="btn-secondary flex items-center gap-2">
              <FiDownload size={18} />
              Izvezi
            </button>
          </div>
        </div>

        <ActivityOverviewAnimation />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <MeetingRoomCalendarCompact />
      </motion.div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="card p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2">
                  <label className="label mb-1">Pretraga</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Pretraži po opisu, korisniku..."
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="label mb-1">Tip aktivnosti</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="input"
                  >
                    <option value="">Svi tipovi</option>
                    {availableFilters.types.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label mb-1">Tip subjekta</label>
                  <select
                    value={filters.subject_type}
                    onChange={(e) => handleFilterChange('subject_type', e.target.value)}
                    className="input"
                  >
                    <option value="">Svi subjekti</option>
                    {availableFilters.subject_types.map((type) => (
                      <option key={type} value={type}>
                        {type.split('\\').pop()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label mb-1">Od datuma</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="label mb-1">Do datuma</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn-secondary flex w-full items-center justify-center gap-2"
                  >
                    <FiX size={18} />
                    Obriši filtere
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ActivityStatCard label="Ukupno logova" value={total} icon={FiActivity} color="blue" delay={0.1} />
        <ActivityStatCard label="Na stranici" value={logs.length} icon={FiClock} color="green" delay={0.16} />
        <ActivityStatCard
          label="Stranica"
          value={`${currentPage} / ${totalPages}`}
          icon={FiFilter}
          color="purple"
          delay={0.22}
        />
      </div>

      {loading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card flex flex-col items-center justify-center p-12"
        >
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Učitavanje logova...</p>
        </motion.div>
      ) : logs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card flex flex-col items-center justify-center p-12 text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-dark-700"
          >
            <FiActivity className="text-gray-400" size={32} />
          </motion.div>
          <p className="text-gray-600 dark:text-gray-400">Nema logova aktivnosti</p>
        </motion.div>
      ) : (
        <div className="relative">
          <div className="absolute bottom-0 left-[1.65rem] top-4 hidden w-px bg-gradient-to-b from-primary-300 via-primary-200 to-transparent dark:from-primary-700 dark:via-primary-800 sm:block" />

          <div className="space-y-4">
            {logs.map((log, index) => {
              const kind = getEventKind(log.description);
              const styles = eventStyles[kind];
              const EventIcon = styles.icon;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
                  whileHover={{ x: 4 }}
                  className="group relative sm:pl-14"
                >
                  <div
                    className={`absolute left-4 top-6 hidden h-3 w-3 rounded-full ring-4 sm:block ${styles.bg} ${styles.ring}`}
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="card w-full overflow-hidden border border-transparent p-0 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-primary-100 dark:hover:ring-primary-900/30"
                  >
                    <div className="flex items-start gap-4 p-5">
                      <motion.div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.bg}`}
                        whileHover={{ scale: 1.08, rotate: 4 }}
                        transition={{ type: 'spring', stiffness: 320 }}
                      >
                        <EventIcon className={styles.iconClass} size={18} />
                      </motion.div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{log.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                          {log.user_name && (
                            <span className="inline-flex items-center gap-1">
                              <FiUser size={14} />
                              {log.user_name}
                              {log.user_email && (
                                <span className="text-gray-500">({log.user_email})</span>
                              )}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <FiClock size={14} />
                            {formatDate(log.created_at)}
                          </span>
                          {log.log_name && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs dark:bg-dark-700">
                              {log.log_name}
                            </span>
                          )}
                        </div>
                        {log.subject_type && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Subjekat: {log.subject_type.split('\\').pop()} #{log.subject_id}
                          </p>
                        )}
                      </div>

                      <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-400 sm:inline-flex">
                        <FiEye size={14} />
                        Detalji
                      </span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 dark:border-dark-700 dark:bg-dark-800"
            >
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-secondary"
              >
                Prethodna
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Stranica {currentPage} od {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary"
              >
                Sljedeća
              </button>
            </motion.div>
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedLog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              type="button"
              aria-label={t('common.close')}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => setSelectedLog(null)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-dark-600 dark:bg-dark-800"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <div className="border-b border-gray-200 bg-gradient-to-r from-primary-50 to-indigo-50 p-6 dark:border-dark-600 dark:from-primary-900/20 dark:to-indigo-900/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                      Detalji aktivnosti
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                      {selectedLog.description}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="rounded-xl p-2 text-gray-400 transition hover:bg-white/60 hover:text-gray-600 dark:hover:bg-dark-700 dark:hover:text-gray-200"
                  >
                    <FiX size={22} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/40">
                    <label className="label mb-1">Korisnik</label>
                    <p className="text-gray-700 dark:text-gray-200">
                      {selectedLog.user_name || 'Sistem'}
                      {selectedLog.user_email && ` (${selectedLog.user_email})`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/40">
                    <label className="label mb-1">Datum i vrijeme</label>
                    <p className="text-gray-700 dark:text-gray-200">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  {selectedLog.log_name && (
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/40">
                      <label className="label mb-1">Tip</label>
                      <p className="text-gray-700 dark:text-gray-200">{selectedLog.log_name}</p>
                    </div>
                  )}
                  {selectedLog.subject_type && (
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-dark-900/40">
                      <label className="label mb-1">Subjekat</label>
                      <p className="text-gray-700 dark:text-gray-200">
                        {selectedLog.subject_type.split('\\').pop()} #{selectedLog.subject_id}
                      </p>
                    </div>
                  )}
                </div>

                {selectedLog.properties && (
                  <div>
                    <label className="label mb-2">Svojstva</label>
                    <pre className="overflow-x-auto rounded-xl bg-gray-100 p-4 text-sm dark:bg-dark-900/60">
                      {JSON.stringify(selectedLog.properties, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
