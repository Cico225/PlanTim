import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiMapPin,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiPlus,
  FiFilter,
} from 'react-icons/fi';

interface VisitSchedule {
  id: number;
  plan_id: number;
  plan?: {
    id: number;
    title: string;
  };
  store_id: number;
  store?: {
    id: number;
    name: string;
    address?: string;
    city?: string;
  };
  assigned_to: number;
  assignedUser?: {
    id: number;
    name: string;
  };
  scheduled_date: string;
  scheduled_time?: string;
  estimated_duration_minutes: number;
  status: 'planned' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
  visit_order?: number;
  notes?: string;
}

export default function VisitCalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan_id');

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedSchedule, setSelectedSchedule] = useState<VisitSchedule | null>(null);

  useEffect(() => {
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, planId, viewMode]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const startDate = getStartOfView(currentDate);
      const endDate = getEndOfView(currentDate);
      
      let url = `/planika/maloprodaja/visit-schedules?date_from=${startDate}&date_to=${endDate}`;
      if (planId) {
        url += `&plan_id=${planId}`;
      }
      
      const data = await apiService.get<VisitSchedule[]>(url);
      setSchedules(data);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      toast.error('Greška pri učitavanju rasporeda obilazaka');
    } finally {
      setLoading(false);
    }
  };

  const getStartOfView = (date: Date): string => {
    if (viewMode === 'month') {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      return firstDay.toISOString().split('T')[0];
    } else {
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      return weekStart.toISOString().split('T')[0];
    }
  };

  const getEndOfView = (date: Date): string => {
    if (viewMode === 'month') {
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return lastDay.toISOString().split('T')[0];
    } else {
      const weekEnd = new Date(date);
      const day = weekEnd.getDay();
      const diff = weekEnd.getDate() - day + (day === 0 ? -6 : 1) + 6;
      weekEnd.setDate(diff);
      return weekEnd.toISOString().split('T')[0];
    }
  };

  const getDaysInView = (): Date[] => {
    const days: Date[] = [];
    
    if (viewMode === 'month') {
      // Get first day of month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // Get last day of month
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Start from Monday of the week containing the first day
      const startDate = new Date(firstDay);
      const dayOfWeek = startDate.getDay();
      const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
      startDate.setDate(diff);
      
      // End on Sunday of the week containing the last day
      const endDate = new Date(lastDay);
      const endDayOfWeek = endDate.getDay();
      const endDiff = endDate.getDate() - endDayOfWeek + (endDayOfWeek === 0 ? 0 : 7);
      endDate.setDate(endDiff);
      
      const current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      // Week view
      const start = getStartOfView(currentDate);
      const end = getEndOfView(currentDate);
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      const current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }
    
    return days;
  };

  const getSchedulesForDate = (date: Date): VisitSchedule[] => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.scheduled_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300';
      case 'missed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="w-4 h-4" />;
      case 'missed':
        return <FiXCircle className="w-4 h-4" />;
      case 'in_progress':
        return <FiClock className="w-4 h-4" />;
      default:
        return <FiCalendar className="w-4 h-4" />;
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateHeader = (): string => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('bs-BA', { month: 'long', year: 'numeric' });
    } else {
      const start = getStartOfView(currentDate);
      const end = getEndOfView(currentDate);
      const startDate = new Date(start);
      const endDate = new Date(end);
      return `${startDate.toLocaleDateString('bs-BA')} - ${endDate.toLocaleDateString('bs-BA')}`;
    }
  };

  const daysInView = getDaysInView();
  const weekDays = ['Ponedeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/planika/retail/plans')}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block"
          >
            ← Nazad na planove
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Kalendar obilazaka
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Pregled rasporeda obilazaka prodavnica
          </p>
        </div>
      </div>

      {/* Calendar Controls - Mobile Responsive */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
          {/* Date Navigation */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 sm:px-4 py-2 btn-secondary text-xs sm:text-sm flex-shrink-0"
            >
              Danas
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white ml-2 sm:ml-4 truncate">
              {formatDateHeader()}
            </h2>
          </div>
          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 border-t sm:border-t-0 border-gray-200 dark:border-gray-700 pt-3 sm:pt-0">
            <button
              onClick={() => setViewMode('week')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Sedmica
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Mjesec
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card p-6">
        {viewMode === 'month' ? (
          <div className="grid grid-cols-7 gap-2">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {daysInView.map((day, index) => {
              const daySchedules = getSchedulesForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
                    isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400' : ''
                  } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                >
                  <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {daySchedules.slice(0, 3).map((schedule) => (
                      <div
                        key={schedule.id}
                        onClick={() => setSelectedSchedule(schedule)}
                        className={`p-2 rounded text-xs cursor-pointer hover:shadow-md transition-all border ${getStatusColor(schedule.status)}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {getStatusIcon(schedule.status)}
                          <span className="font-medium truncate">
                            {schedule.store?.name || 'N/A'}
                          </span>
                        </div>
                        {schedule.scheduled_time && (
                          <div className="flex items-center gap-1 text-xs opacity-75">
                            <FiClock className="w-3 h-3" />
                            {typeof schedule.scheduled_time === 'string' ? schedule.scheduled_time : new Date(schedule.scheduled_time).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ))}
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 p-1">
                        +{daySchedules.length - 3} više
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {daysInView.map((day, index) => {
              const daySchedules = getSchedulesForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${isToday ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className={`font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                        {day.toLocaleDateString('bs-BA', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                      {isToday && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">Danas</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {daySchedules.length} {daySchedules.length === 1 ? 'obilazak' : 'obilazaka'}
                    </span>
                  </div>
                  {daySchedules.length > 0 ? (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          onClick={() => setSelectedSchedule(schedule)}
                          className={`p-3 rounded-lg cursor-pointer hover:shadow-md transition-all border ${getStatusColor(schedule.status)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getStatusIcon(schedule.status)}
                                <span className="font-semibold">{schedule.store?.name || 'N/A'}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(schedule.status)}`}>
                                  {schedule.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
                                {schedule.scheduled_time && (
                                  <div className="flex items-center gap-1">
                                    <FiClock className="w-4 h-4" />
                                    {schedule.scheduled_time}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <FiMapPin className="w-4 h-4" />
                                  {schedule.store?.city || schedule.store?.address || 'N/A'}
                                </div>
                                {schedule.assignedUser && (
                                  <div className="flex items-center gap-1">
                                    <FiUser className="w-4 h-4" />
                                    {schedule.assignedUser.name}
                                  </div>
                                )}
                              </div>
                              {schedule.plan && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Plan: {schedule.plan.title}
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {schedule.estimated_duration_minutes} min
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Nema obilazaka za ovaj dan
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Detail Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Detalji obilaska
                </h3>
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Prodavnica</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {selectedSchedule.store?.name}
                </p>
                {selectedSchedule.store?.address && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <FiMapPin className="w-4 h-4 inline mr-1" />
                    {selectedSchedule.store.address}
                    {selectedSchedule.store.city && `, ${selectedSchedule.store.city}`}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Datum</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {new Date(selectedSchedule.scheduled_date).toLocaleDateString('bs-BA')}
                  </p>
                </div>
                {selectedSchedule.scheduled_time && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Vrijeme</label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {typeof selectedSchedule.scheduled_time === 'string' 
                        ? selectedSchedule.scheduled_time 
                        : new Date(selectedSchedule.scheduled_time).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${getStatusColor(selectedSchedule.status)}`}>
                      {getStatusIcon(selectedSchedule.status)}
                      {selectedSchedule.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Trajanje</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {selectedSchedule.estimated_duration_minutes} minuta
                  </p>
                </div>
              </div>

              {selectedSchedule.assignedUser && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Dodijeljeno</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    <FiUser className="w-4 h-4 inline mr-1" />
                    {selectedSchedule.assignedUser.name}
                  </p>
                </div>
              )}

              {selectedSchedule.plan && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {selectedSchedule.plan.title}
                  </p>
                </div>
              )}

              {selectedSchedule.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Napomene</label>
                  <p className="text-gray-900 dark:text-white mt-1">
                    {selectedSchedule.notes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedSchedule(null)}
                  className="btn-secondary"
                >
                  Zatvori
                </button>
                {selectedSchedule.status === 'planned' && (
                  <button
                    onClick={() => {
                      navigate(`/planika/retail/visits/${selectedSchedule.id}/check-in`);
                    }}
                    className="btn-primary"
                  >
                    Check-in
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

