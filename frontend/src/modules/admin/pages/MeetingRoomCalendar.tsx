import { useState, useEffect } from 'react';
import {
  FiCalendar,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiTrash2,
  FiUser,
  FiClock,
  FiEdit,
} from 'react-icons/fi';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isSameMonth, isToday, parseISO } from 'date-fns';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface MeetingRoom {
  id: number;
  name: string;
  location: string | null;
  description: string | null;
  capacity: number | null;
  equipment: string[] | null;
  is_active: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface MeetingReservation {
  id: number;
  room_id: number;
  created_by: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  participants: number[] | null;
  room?: MeetingRoom;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

type ViewMode = 'day' | 'week' | 'month';

export default function MeetingRoomCalendar() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [reservations, setReservations] = useState<MeetingReservation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<MeetingReservation | null>(null);
  const [formData, setFormData] = useState<{
    room_id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    participants: number[];
  }>({
    room_id: '',
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    participants: [],
  });

  useEffect(() => {
    loadRooms();
    loadUsers();
  }, []);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms]);

  useEffect(() => {
    if (selectedRoomId) {
      loadReservations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, currentDate, viewMode]);

  const loadRooms = async () => {
    try {
      const data = await apiService.get<MeetingRoom[]>('/meeting-rooms/rooms');
      setRooms(data);
    } catch (error: any) {
      console.error('Failed to load rooms:', error);
      toast.error('Greška pri učitavanju sala');
    }
  };

  const loadUsers = async () => {
    try {
      // Koristimo postojeći endpoint koji vraća aktivne korisnike aplikacije
      const data = await apiService.get<User[]>('/chat/users');
      setUsers(data || []);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error('Greška pri učitavanju korisnika');
    }
  };

  const loadReservations = async () => {
    if (!selectedRoomId) return;

    try {
      setLoading(true);
      const { dateFrom, dateTo } = getDateRange();
      const data = await apiService.get<MeetingReservation[]>(
        `/meeting-rooms/reservations?room_id=${selectedRoomId}&date_from=${dateFrom}&date_to=${dateTo}`
      );
      setReservations(data);
    } catch (error: any) {
      console.error('Failed to load reservations:', error);
      toast.error('Greška pri učitavanju rezervacija');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    let dateFrom: Date;
    let dateTo: Date;

    if (viewMode === 'day') {
      dateFrom = new Date(currentDate);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(currentDate);
      dateTo.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      dateFrom = startOfWeek(currentDate, { weekStartsOn: 1 });
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = endOfWeek(currentDate, { weekStartsOn: 1 });
      dateTo.setHours(23, 59, 59, 999);
    } else {
      dateFrom = startOfMonth(currentDate);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = endOfMonth(currentDate);
      dateTo.setHours(23, 59, 59, 999);
    }

    return {
      dateFrom: format(dateFrom, 'yyyy-MM-dd'),
      dateTo: format(dateTo, 'yyyy-MM-dd'),
    };
  };

  const handleCreateReservation = (date?: Date, hour?: number) => {
    setEditingReservation(null);
    
    let startTime = '';
    let endTime = '';
    
    if (date && hour !== undefined) {
      // Validate hour is within working hours (08:00-16:30)
      if (hour < 8 || hour > 16) {
        toast.error('Rezervacije su moguće samo u radnom vremenu (08:00-16:30)');
        return;
      }
      
      // Check if the selected date and time is in the past
      const now = new Date();
      const startDate = new Date(date);
      startDate.setHours(hour, 0, 0, 0);
      
      // Allow reservations for today and future dates
      // Only block if the time has already passed today
      const isToday = isSameDay(startDate, now);
      if (isToday && startDate < now) {
        toast.error('Ne možete rezervisati termin u prošlosti');
        return;
      }
      
      startTime = format(startDate, "yyyy-MM-dd'T'HH:mm");
      
      // Set end time to 1 hour later, but not after 16:30
      const endDate = new Date(startDate);
      if (hour === 16) {
        // If starting at 16:00, end at 16:30
        endDate.setHours(16, 30, 0, 0);
      } else {
        endDate.setHours(hour + 1, 0, 0, 0);
      }
      endTime = format(endDate, "yyyy-MM-dd'T'HH:mm");
    }
    
    setFormData({
      room_id: selectedRoomId?.toString() || '',
      title: '',
      description: '',
      start_time: startTime,
      end_time: endTime,
      participants: [],
    });
    setShowReservationModal(true);
  };

  const handleEditReservation = (reservation: MeetingReservation) => {
    if (reservation.created_by !== user?.id) {
      toast.error('Samo kreator rezervacije može je mijenjati');
      return;
    }

    setEditingReservation(reservation);
    setFormData({
      room_id: reservation.room_id.toString(),
      title: reservation.title,
      description: reservation.description || '',
      start_time: format(parseISO(reservation.start_time), "yyyy-MM-dd'T'HH:mm"),
      end_time: format(parseISO(reservation.end_time), "yyyy-MM-dd'T'HH:mm"),
      participants: reservation.participants || [],
    });
    setShowReservationModal(true);
  };

  const handleDeleteReservation = async (id: number) => {
    const reservation = reservations.find(r => r.id === id);
    if (reservation && reservation.created_by !== user?.id) {
      toast.error('Samo kreator rezervacije može je obrisati');
      return;
    }

    if (!confirm('Da li ste sigurni da želite obrisati ovu rezervaciju?')) {
      return;
    }

    try {
      await apiService.delete(`/meeting-rooms/reservations/${id}`);
      toast.success('Rezervacija je obrisana');
      loadReservations();
    } catch (error: any) {
      console.error('Failed to delete reservation:', error);
      toast.error(error.response?.data?.error || 'Greška pri brisanju rezervacije');
    }
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate working hours (08:00-16:30)
    if (formData.start_time) {
      const startDate = new Date(formData.start_time);
      const startHour = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      if (startHour < 8 || startHour > 16 || (startHour === 16 && startMinutes > 30)) {
        toast.error('Rezervacije su moguće samo u radnom vremenu (08:00-16:30)');
        return;
      }
    }

    if (formData.end_time) {
      const endDate = new Date(formData.end_time);
      const endHour = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      if (endHour < 8 || endHour > 16 || (endHour === 16 && endMinutes > 30)) {
        toast.error('Rezervacije su moguće samo u radnom vremenu (08:00-16:30)');
        return;
      }
    }

    try {
      const payload = {
        room_id: parseInt(formData.room_id),
        title: formData.title,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        participants: formData.participants,
      };

      if (editingReservation) {
        await apiService.put(`/meeting-rooms/reservations/${editingReservation.id}`, payload);
        toast.success('Rezervacija je ažurirana');
      } else {
        await apiService.post('/meeting-rooms/reservations', payload);
        toast.success('Rezervacija je kreirana');
      }

      setShowReservationModal(false);
      loadReservations();
    } catch (error: any) {
      console.error('Failed to save reservation:', error);
      toast.error(error.response?.data?.error || 'Greška pri čuvanju rezervacije');
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const getReservationsForTimeSlot = (date: Date, hour?: number) => {
    return reservations.filter(reservation => {
      try {
        const start = parseISO(reservation.start_time);
        const end = parseISO(reservation.end_time);

        // Normalize dates to compare only the date part (ignore time)
        const reservationDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        // Check if reservation is on the same day
        if (reservationDate.getTime() !== targetDate.getTime()) {
          return false;
        }

        if (hour !== undefined) {
          // For specific hour slot, check if reservation overlaps with this hour
          const hourStart = new Date(date);
          hourStart.setHours(hour, 0, 0, 0);
          const hourEnd = new Date(date);
          // Special handling for hour 16: end at 16:30 instead of 17:00
          if (hour === 16) {
            hourEnd.setHours(16, 30, 0, 0);
          } else {
            hourEnd.setHours(hour + 1, 0, 0, -1); // End of hour (59:59.999)
          }
          
          // Check if reservation overlaps with this hour slot
          // Overlap occurs if: reservation starts before hour ends AND reservation ends after hour starts
          const overlaps = start < hourEnd && end > hourStart;
          
          return overlaps;
        } else {
          // For month view (no specific hour), show all reservations on this day
          return true;
        }
      } catch (error) {
        console.error('Error parsing reservation time:', error, reservation);
        return false;
      }
    });
  };

  const getReservationColor = (reservation: MeetingReservation) => {
    if (reservation.created_by === user?.id) {
      return 'bg-yellow-50 border-yellow-400 text-yellow-900 dark:bg-yellow-900/40 dark:border-yellow-600 dark:text-yellow-300';
    }
    return 'bg-red-50 border-red-400 text-red-900 dark:bg-red-900/40 dark:border-red-600 dark:text-red-300';
  };

  const getParticipantNames = (reservation: MeetingReservation): string[] => {
    if (!reservation.participants || reservation.participants.length === 0) return [];
    if (users.length === 0) return reservation.participants.map(id => `Korisnik #${id}`);

    return reservation.participants
      .map(id => {
        const u = users.find(userItem => userItem.id === id);
        return u?.name || u?.email || `Korisnik #${id}`;
      })
      .filter((name): name is string => Boolean(name));
  };

  const renderDayView = () => {
    const dayReservations = getReservationsForTimeSlot(currentDate).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return (
      <div
        className={`rounded-lg border-2 p-4 sm:p-5 min-h-[300px] ${
          isToday(currentDate)
            ? 'border-green-500 dark:border-green-400 bg-green-50/30 dark:bg-green-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30'
        }`}
      >
        <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {format(currentDate, 'EEEE, d. MMMM yyyy')}
          </div>
        </div>
        <div className="space-y-3">
          {dayReservations.length === 0 ? (
            <div
              className="min-h-[160px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors touch-manipulation"
              onClick={() => handleCreateReservation(currentDate)}
            >
              <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                🟢 Slobodno – klikni za rezervaciju
              </span>
            </div>
          ) : (
            <>
              {dayReservations.map(reservation => (
                <div
                  key={reservation.id}
                  className={`p-3 sm:p-4 rounded-lg border-2 shadow-sm cursor-pointer hover:shadow-md transition-all touch-manipulation ${getReservationColor(reservation)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditReservation(reservation);
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base mb-1 truncate">{reservation.title}</div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs opacity-90">
                        <div className="flex items-center gap-1">
                          <FiClock size={12} />
                          <span>
                            {format(parseISO(reservation.start_time), 'HH:mm')} - {format(parseISO(reservation.end_time), 'HH:mm')}
                          </span>
                        </div>
                        {reservation.creator && (
                          <div className="flex items-center gap-1">
                            <FiUser size={12} />
                            <span className="truncate">{reservation.creator.name || reservation.creator.email}</span>
                          </div>
                        )}
                        {getParticipantNames(reservation).length > 0 && (
                          <div className="flex items-center gap-1">
                            <FiUser size={12} />
                            <span className="truncate">
                              {(() => {
                                const names = getParticipantNames(reservation);
                                if (names.length <= 2) return names.join(', ');
                                return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                      {reservation.description && (
                        <div className="text-xs mt-1 opacity-75 line-clamp-1">{reservation.description}</div>
                      )}
                    </div>
                    {reservation.created_by === user?.id && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReservation(reservation);
                          }}
                          className="p-2 sm:p-1.5 rounded hover:bg-white/20 dark:hover:bg-black/20 transition-colors touch-manipulation"
                          title="Izmijeni"
                        >
                          <FiEdit size={16} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReservation(reservation.id);
                          }}
                          className="p-2 sm:p-1.5 rounded hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors touch-manipulation"
                          title="Obriši"
                        >
                          <FiTrash2 size={16} className="sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div
                className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors touch-manipulation flex items-center justify-center py-4"
                onClick={() => handleCreateReservation(currentDate)}
              >
                <span className="text-sm text-gray-500 dark:text-gray-400">+ Dodaj rezervaciju</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderWeekDayCard = (day: Date) => {
    const dayReservations = getReservationsForTimeSlot(day).sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return (
      <div
        key={day.toISOString()}
        className={`flex flex-col rounded-lg border-2 p-3 sm:min-h-[320px] sm:p-3 ${
          isToday(day)
            ? 'border-green-500 bg-green-50/30 dark:border-green-400 dark:bg-green-900/10'
            : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30'
        }`}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-600 sm:mb-2 sm:block sm:pb-2">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 sm:text-xs">
            <span className="sm:hidden">{format(day, 'EEEE')}</span>
            <span className="hidden sm:inline">{format(day, 'EEE')}</span>
          </div>
          <div
            className={`text-base font-semibold sm:text-xl ${
              isToday(day) ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'
            }`}
          >
            <span className="sm:hidden">{format(day, 'd. MMM')}</span>
            <span className="hidden sm:inline">{format(day, 'd')}</span>
          </div>
        </div>

        <div className="space-y-2 sm:flex-1 sm:overflow-y-auto">
          {dayReservations.length === 0 ? (
            <div
              className="flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800/50 cursor-pointer touch-manipulation sm:min-h-[120px] sm:flex-1"
              onClick={() => handleCreateReservation(day)}
            >
              <span className="px-2 text-center text-sm text-gray-500 dark:text-gray-400 sm:text-xs">
                🟢 Slobodno – klikni za rezervaciju
              </span>
            </div>
          ) : (
            <>
              {dayReservations.map(reservation => (
                <div
                  key={reservation.id}
                  className={`cursor-pointer rounded-lg border-2 p-3 text-sm shadow-sm transition-all hover:shadow-md touch-manipulation sm:p-2.5 sm:text-xs ${getReservationColor(reservation)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditReservation(reservation);
                  }}
                >
                  <div className="mb-1 truncate font-semibold">{reservation.title}</div>
                  <div className="mb-1 flex items-center gap-1.5 opacity-90">
                    <FiClock size={12} className="shrink-0 sm:h-3 sm:w-3" />
                    <span className="text-xs sm:text-[10px]">
                      {format(parseISO(reservation.start_time), 'HH:mm')} –{' '}
                      {format(parseISO(reservation.end_time), 'HH:mm')}
                    </span>
                  </div>
                  {reservation.creator && (
                    <div className="flex items-center gap-1 truncate text-xs opacity-75 sm:text-[10px]">
                      <FiUser size={11} className="shrink-0 sm:h-2.5 sm:w-2.5" />
                      <span className="truncate">
                        {reservation.creator.name || reservation.creator.email}
                      </span>
                    </div>
                  )}
                  {getParticipantNames(reservation).length > 0 && (
                    <div className="flex items-center gap-1 truncate text-xs opacity-75 sm:text-[10px]">
                      <FiUser size={11} className="shrink-0 sm:h-2.5 sm:w-2.5" />
                      <span className="truncate">
                        {(() => {
                          const names = getParticipantNames(reservation);
                          if (names.length <= 2) return names.join(', ');
                          return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
                        })()}
                      </span>
                    </div>
                  )}
                  {reservation.created_by === user?.id && (
                    <div className="mt-2 flex items-center gap-1 border-t border-current/20 pt-2 sm:mt-1.5 sm:pt-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReservation(reservation.id);
                        }}
                        className="flex items-center gap-1 text-sm text-red-600 hover:opacity-80 dark:text-red-400 touch-manipulation sm:text-[10px]"
                        title="Obriši"
                      >
                        <FiTrash2 size={12} className="sm:h-3 sm:w-3" />
                        <span>Obriši</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div
                className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-2 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800/50 touch-manipulation"
                onClick={() => handleCreateReservation(day)}
              >
                <span className="text-sm text-gray-500 dark:text-gray-400 sm:text-xs">+ Dodaj rezervaciju</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-2 md:gap-3">
        {weekDays.map(day => renderWeekDayCard(day))}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map(day => (
          <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
        {days.map(day => {
          const dayReservations = getReservationsForTimeSlot(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-200 dark:border-gray-700 ${
                !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900/50' : ''
              } ${isToday(day) ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-green-500 dark:ring-green-400' : ''}`}
            >
              <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isCurrentMonth ? '' : 'text-gray-400'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                {dayReservations.slice(0, 2).map(reservation => (
                  <div
                    key={reservation.id}
                    className={`text-[9px] sm:text-xs p-1 sm:p-2 rounded-lg truncate border-2 shadow-sm cursor-pointer hover:shadow-md transition-all touch-manipulation ${getReservationColor(reservation)}`}
                    title={`${reservation.title} - ${reservation.creator?.name || ''} - ${format(parseISO(reservation.start_time), 'HH:mm')} - ${format(parseISO(reservation.end_time), 'HH:mm')}`}
                    onClick={() => handleEditReservation(reservation)}
                  >
                    <div className="font-semibold truncate mb-0.5">
                      <span className="hidden sm:inline">{format(parseISO(reservation.start_time), 'HH:mm')} </span>
                      <span className="sm:hidden">{format(parseISO(reservation.start_time), 'HH:mm')}</span>
                      {reservation.title}
                    </div>
                    {reservation.creator && (
                      <div className="text-[8px] sm:text-xs opacity-75 truncate flex items-center gap-0.5 sm:gap-1">
                        <FiUser size={7} className="sm:w-2.5 sm:h-2.5" />
                        <span className="truncate">{reservation.creator.name || reservation.creator.email}</span>
                      </div>
                    )}
                    {getParticipantNames(reservation).length > 0 && (
                      <div className="text-[8px] sm:text-xs opacity-75 truncate flex items-center gap-0.5 sm:gap-1">
                        <FiUser size={7} className="sm:w-2.5 sm:h-2.5" />
                        <span className="truncate">
                          {(() => {
                            const names = getParticipantNames(reservation);
                            if (names.length <= 2) return names.join(', ');
                            return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {dayReservations.length > 2 && (
                  <div className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-400 px-0.5 sm:px-1">+{dayReservations.length - 2} više</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiCalendar className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={20} />
            <span className="truncate">Kalendar Zauzetosti Sala</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            <span className="hidden sm:inline">Pregled i rezervacija sala za sastanke - 3. sprat | </span>Radno vrijeme: 08:00 - 16:30
          </p>
        </div>
        <button
          onClick={() => handleCreateReservation()}
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto py-2.5 sm:py-2 touch-manipulation"
        >
          <FiPlus size={18} />
          <span className="text-sm sm:text-base">Rezerviši termin</span>
        </button>
      </div>

      {/* Controls */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Room Selector */}
          <div className="w-full">
            <label className="label mb-1 text-xs sm:text-sm">Izaberi salu</label>
            <select
              value={selectedRoomId || ''}
              onChange={(e) => setSelectedRoomId(parseInt(e.target.value))}
              className="input w-full text-sm sm:text-base touch-manipulation"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name} {room.location ? `(${room.location})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
            {/* View Mode */}
            <div className="flex gap-2 w-full sm:w-auto">
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation ${
                    viewMode === mode
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95'
                  }`}
                >
                  {mode === 'day' ? 'Dan' : mode === 'week' ? 'Sedmica' : 'Mjesec'}
                </button>
              ))}
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 touch-manipulation flex-shrink-0 transition-colors"
                aria-label="Prethodni"
              >
                <FiChevronLeft size={20} />
              </button>
              <div className="text-center flex-1 sm:flex-none sm:min-w-[200px] px-2">
                <div className="font-medium text-sm sm:text-base text-gray-900 dark:text-white whitespace-nowrap">
                  {viewMode === 'day'
                    ? format(currentDate, 'dd.MM.yyyy')
                    : viewMode === 'week'
                    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.yyyy')}`
                    : format(currentDate, 'MMMM yyyy')}
                </div>
              </div>
              <button
                onClick={() => navigateDate('next')}
                className="p-2.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 touch-manipulation flex-shrink-0 transition-colors"
                aria-label="Sledeći"
              >
                <FiChevronRight size={20} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 touch-manipulation whitespace-nowrap transition-all"
              >
                Danas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-red-50 border-2 border-red-400 dark:bg-red-900/40 dark:border-red-600 flex-shrink-0"></div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Zauzeto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-yellow-50 border-2 border-yellow-400 dark:bg-yellow-900/40 dark:border-yellow-600 flex-shrink-0"></div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Moj sastanak</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg bg-green-50 border-2 border-green-400 dark:bg-green-900/40 dark:border-green-600 flex-shrink-0"></div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Slobodno</span>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div
        className={`card p-0 sm:p-4 overflow-hidden ${
          viewMode === 'day' && isToday(currentDate)
            ? 'ring-2 ring-green-500 dark:ring-green-400'
            : ''
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center h-48 sm:h-64 p-4">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="p-2 sm:p-0">
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl dark:bg-gray-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
            <div className="shrink-0 border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  {editingReservation ? 'Izmijeni rezervaciju' : 'Nova rezervacija'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReservationModal(false)}
                  className="-mr-2 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 touch-manipulation"
                  aria-label="Zatvori"
                >
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitReservation} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:space-y-5 sm:p-6">
              <div>
                <label className="label mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <FiCalendar size={16} />
                  Sala *
                </label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  className="input w-full min-w-0 text-base touch-manipulation sm:text-base"
                  required
                >
                  <option value="">Izaberi salu</option>
                  {rooms.map(room => (
                    <option key={room.id} value={room.id}>
                      {room.name} {room.location ? `(${room.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-2 text-sm sm:text-base">Naziv sastanka *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full min-w-0 text-base sm:text-base"
                  required
                  placeholder="Npr. Tim meeting, Uprava, Klijent call..."
                />
              </div>
              <div>
                <label className="label mb-2 text-sm sm:text-base">Opis</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full min-w-0 text-base sm:text-base"
                  rows={3}
                  placeholder="Opis sastanka (opciono)"
                />
              </div>
              <div>
                <label className="label mb-2 flex items-center gap-2 text-sm sm:text-base">
                  <FiUser size={16} />
                  Učesnici sastanka
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto p-2 sm:p-3 space-y-1 bg-gray-50 dark:bg-gray-900/40">
                  {users.length === 0 ? (
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-1 py-1.5">
                      Nema dostupnih korisnika ili nije moguće učitati listu korisnika.
                    </div>
                  ) : (
                    users.map(u => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-white/60 dark:hover:bg-gray-800 cursor-pointer text-sm sm:text-sm touch-manipulation"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0 text-primary-600 border-gray-300 rounded"
                          checked={formData.participants.includes(u.id)}
                          onChange={() => {
                            setFormData(prev => {
                              const alreadySelected = prev.participants.includes(u.id);
                              return {
                                ...prev,
                                participants: alreadySelected
                                  ? prev.participants.filter(id => id !== u.id)
                                  : [...prev.participants, u.id],
                              };
                            });
                          }}
                        />
                        <span className="truncate">
                          {u.name || u.email}
                          {u.name && u.email ? ` (${u.email})` : ''}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Odaberite osobe koje će prisustvovati sastanku.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <FiClock size={16} />
                    Početak *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input w-full min-w-0 max-w-full text-base touch-manipulation sm:text-base"
                    required
                    step="900"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Vrijeme će biti zaokruženo na 15-minutne intervale
                  </p>
                </div>
                <div>
                  <label className="label mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <FiClock size={16} />
                    Kraj *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="input w-full min-w-0 max-w-full text-base touch-manipulation sm:text-base"
                    required
                    step="900"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Vrijeme će biti zaokruženo na 15-minutne intervale
                  </p>
                </div>
              </div>
              {editingReservation && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                    <strong>Napomena:</strong> Samo vi možete mijenjati ili brisati ovu rezervaciju jer ste je vi kreirali.
                  </p>
                </div>
              )}
              </div>
              <div className="shrink-0 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowReservationModal(false)}
                    className="btn-secondary w-full py-3 sm:w-auto sm:py-2 touch-manipulation"
                  >
                    Otkaži
                  </button>
                  <button type="submit" className="btn-primary w-full py-3 sm:w-auto sm:py-2 touch-manipulation">
                    {editingReservation ? 'Sačuvaj izmjene' : 'Kreiraj rezervaciju'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

