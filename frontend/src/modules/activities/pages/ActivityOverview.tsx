import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiActivity,
  FiFilter,
  FiSearch,
  FiDownload,
  FiUser,
  FiClock,
  FiEye,
  FiX,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import MeetingRoomCalendarCompact from '../components/MeetingRoomCalendarCompact';

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
      console.log('📋 Activity logs response:', response);
      
      // Handle response structure - apiService.get returns response.data directly
      if (response && response.data) {
        // Paginated response structure
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
        // Direct array response (fallback)
        setLogs(response);
        setTotalPages(1);
        setTotal(response.length);
      } else {
        // Empty response
        setLogs([]);
        setTotalPages(1);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error fetching activity logs:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Greška pri učitavanju logova aktivnosti');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
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

  const getEventIcon = (description: string) => {
    if (!description) return <FiActivity className="text-gray-400" size={16} />;
    
    const descLower = description.toLowerCase();
    if (descLower.includes('created') || descLower.includes('create') || descLower.includes('kreirao')) {
      return <span className="text-green-600 dark:text-green-400">+</span>;
    }
    if (descLower.includes('updated') || descLower.includes('update') || descLower.includes('ažurirao') || descLower.includes('izmenio')) {
      return <span className="text-blue-600 dark:text-blue-400">✎</span>;
    }
    if (descLower.includes('deleted') || descLower.includes('delete') || descLower.includes('obrisao')) {
      return <span className="text-red-600 dark:text-red-400">×</span>;
    }
    return <FiActivity className="text-gray-400" size={16} />;
  };

  const getEventColor = (description: string) => {
    if (!description) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    
    const descLower = description.toLowerCase();
    if (descLower.includes('created') || descLower.includes('create') || descLower.includes('kreirao')) {
      return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
    }
    if (descLower.includes('updated') || descLower.includes('update') || descLower.includes('ažurirao') || descLower.includes('izmenio')) {
      return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
    }
    if (descLower.includes('deleted') || descLower.includes('delete') || descLower.includes('obrisao')) {
      return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400';
    }
    return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  const exportLogs = () => {
    // TODO: Implement export functionality
    toast.success('Funkcionalnost izvoza logova će biti dodata uskoro');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiActivity className="text-gray-600 dark:text-gray-400" />
            Pregled Aktivnosti
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Pregled svih aktivnosti korisnika i sistema, te rezervacija sala za sastanke
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center gap-2"
          >
            <FiFilter size={18} />
            {showFilters ? 'Sakrij Filtere' : 'Filtriraj'}
          </button>
          <button
            onClick={exportLogs}
            className="btn-secondary flex items-center gap-2"
          >
            <FiDownload size={18} />
            Izvezi
          </button>
        </div>
      </div>

      {/* Meeting Room Calendar - Above Recent Activities */}
      <MeetingRoomCalendarCompact />

      {/* Filters */}
      {showFilters && (
            <div className="card p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className="label mb-1">Pretraga</label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Pretraži po opisu, korisniku..."
                      className="input pl-10"
                    />
                  </div>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="label mb-1">Tip Aktivnosti</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="input"
                  >
                    <option value="">Svi tipovi</option>
                    {availableFilters.types.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>


                {/* Subject Type Filter */}
                <div>
                  <label className="label mb-1">Tip Subjekta</label>
                  <select
                    value={filters.subject_type}
                    onChange={(e) => handleFilterChange('subject_type', e.target.value)}
                    className="input"
                  >
                    <option value="">Svi subjekti</option>
                    {availableFilters.subject_types.map(type => (
                      <option key={type} value={type}>{type.split('\\').pop()}</option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="label mb-1">Od Datuma</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                {/* Date To */}
                <div>
                  <label className="label mb-1">Do Datuma</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <FiX size={18} />
                    Obriši Filtere
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Logova</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <FiActivity className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Na Stranici</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{logs.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <FiClock className="text-green-600 dark:text-green-400" size={24} />
                </div>
              </div>
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Stranica</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {currentPage} / {totalPages}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <FiFilter className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Logs List */}
          {loading ? (
            <div className="card p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Učitavanje logova...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="card p-8 text-center">
              <FiActivity className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400">Nema logova aktivnosti</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start gap-4">
                    {/* Event Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getEventColor(log.description)}`}>
                      {getEventIcon(log.description)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white font-medium">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {log.user_name && (
                              <div className="flex items-center gap-1">
                                <FiUser size={14} />
                                <span>{log.user_name}</span>
                                {log.user_email && (
                                  <span className="text-gray-500">({log.user_email})</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <FiClock size={14} />
                              <span>{formatDate(log.created_at)}</span>
                            </div>
                            {log.log_name && (
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {log.log_name}
                              </span>
                            )}
                          </div>
                          {log.subject_type && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Subjekat: {log.subject_type.split('\\').pop()} #{log.subject_id}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="btn-secondary flex items-center gap-2 flex-shrink-0"
                        >
                          <FiEye size={16} />
                          Detalji
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                  >
                    Prethodna
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Stranica {currentPage} od {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                  >
                    Sledeća
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Log Details Modal */}
          {selectedLog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Detalji Aktivnosti
                    </h2>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <FiX size={24} />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="label mb-1">Opis</label>
                    <p className="text-gray-900 dark:text-white">{selectedLog.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label mb-1">Korisnik</label>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedLog.user_name || 'Sistem'}
                        {selectedLog.user_email && ` (${selectedLog.user_email})`}
                      </p>
                    </div>
                    <div>
                      <label className="label mb-1">Datum i Vreme</label>
                      <p className="text-gray-600 dark:text-gray-400">
                        {formatDate(selectedLog.created_at)}
                      </p>
                    </div>
                    {selectedLog.log_name && (
                      <div>
                        <label className="label mb-1">Tip</label>
                        <p className="text-gray-600 dark:text-gray-400">{selectedLog.log_name}</p>
                      </div>
                    )}
                    {selectedLog.subject_type && (
                      <div>
                        <label className="label mb-1">Tip Subjekta</label>
                        <p className="text-gray-600 dark:text-gray-400">
                          {selectedLog.subject_type.split('\\').pop()}
                        </p>
                      </div>
                    )}
                    {selectedLog.subject_id && (
                      <div>
                        <label className="label mb-1">ID Subjekta</label>
                        <p className="text-gray-600 dark:text-gray-400">#{selectedLog.subject_id}</p>
                      </div>
                    )}
                  </div>
                  {selectedLog.properties && (
                    <div>
                      <label className="label mb-1">Svojstva</label>
                      <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm">
                        {JSON.stringify(selectedLog.properties, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
    </div>
  );
}

