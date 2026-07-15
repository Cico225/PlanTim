import { useState, useEffect } from 'react';
import {
  FiCalendar,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiClock,
  FiUser,
} from 'react-icons/fi';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday, parseISO } from 'date-fns';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface MeetingRoom {
  id: number;
  name: string;
  location: string | null;
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
  start_time: string;
  end_time: string;
  participants: number[] | null;
  room?: MeetingRoom;
}

export default function MeetingRoomCalendarCompact() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [reservations, setReservations] = useState<MeetingReservation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
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
  }, [selectedRoomId, currentDate]);

  const loadRooms = async () => {
    try {
      const data = await apiService.get<MeetingRoom[]>('/meeting-rooms/rooms');
      setRooms(data);
    } catch (error: any) {
      console.error('Failed to load rooms:', error);
    }
  };

  const loadUsers = async () => {
    try {
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
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      const data = await apiService.get<MeetingReservation[]>(
        `/meeting-rooms/reservations?room_id=${selectedRoomId}&date_from=${format(weekStart, 'yyyy-MM-dd')}&date_to=${format(weekEnd, 'yyyy-MM-dd')}`
      );
      setReservations(data);
    } catch (error: any) {
      console.error('Failed to load reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = () => {
    setFormData({
      room_id: selectedRoomId?.toString() || '',
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      participants: [],
    });
    setShowReservationModal(true);
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        room_id: parseInt(formData.room_id),
        title: formData.title,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        participants: formData.participants,
      };

      await apiService.post('/meeting-rooms/reservations', payload);
      toast.success('Rezervacija je kreirana');
      setShowReservationModal(false);
      loadReservations();
    } catch (error: any) {
      console.error('Failed to save reservation:', error);
      toast.error(error.response?.data?.error || 'Greška pri čuvanju rezervacije');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
  };

  const getReservationsForDay = (day: Date) => {
    return reservations.filter(reservation => {
      const start = parseISO(reservation.start_time);
      return isSameDay(start, day);
    });
  };

  const getReservationColor = (reservation: MeetingReservation) => {
    if (reservation.created_by === user?.id) {
      return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400';
    }
    return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400';
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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });

  return (
    <>
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <FiCalendar className="text-gray-600 dark:text-gray-400" size={20} />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Kalendar Zauzetosti Sala
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedRoomId || ''}
              onChange={(e) => setSelectedRoomId(parseInt(e.target.value))}
              className="input text-sm"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name} {room.location ? `(${room.location})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleCreateReservation}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <FiPlus size={16} />
              Rezerviši
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="font-medium text-gray-900 dark:text-white">
              {format(weekStart, 'dd.MM')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'dd.MM.yyyy')}
            </div>
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiChevronRight size={20} />
          </button>
        </div>

        {/* Week Calendar */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-2">
            {weekDays.map(day => {
              const dayReservations = getReservationsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-lg border p-3 sm:min-h-[120px] sm:p-2 ${
                    isToday(day)
                      ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 sm:block">
                    <div className={`text-sm font-medium sm:text-xs ${isToday(day) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      <span className="sm:hidden">{format(day, 'EEEE')}</span>
                      <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                    </div>
                    <div className={`text-base font-semibold sm:mb-2 sm:text-sm ${isToday(day) ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                      <span className="sm:hidden">{format(day, 'd. MMM')}</span>
                      <span className="hidden sm:inline">{format(day, 'd')}</span>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-1">
                    {dayReservations.slice(0, 2).map(reservation => (
                      <div
                        key={reservation.id}
                        className={`rounded border p-2 text-sm sm:truncate sm:p-1 sm:text-xs ${getReservationColor(reservation)}`}
                        title={reservation.title}
                      >
                        <div className="flex items-center gap-1">
                          <FiClock size={12} className="sm:h-[10px] sm:w-[10px]" />
                          <span>{format(parseISO(reservation.start_time), 'HH:mm')}</span>
                        </div>
                        <div className="truncate font-medium">{reservation.title}</div>
                        {getParticipantNames(reservation).length > 0 && (
                          <div className="truncate text-xs text-gray-700 dark:text-gray-300 sm:text-[11px]">
                            {(() => {
                              const names = getParticipantNames(reservation);
                              if (names.length <= 2) return names.join(', ');
                              return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                    {dayReservations.length > 2 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 sm:text-xs">
                        +{dayReservations.length - 2} više
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
            <span>Zauzeto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
            <span>Moj sastanak</span>
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      {showReservationModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl dark:bg-gray-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg">
            <div className="shrink-0 border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  Nova rezervacija
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
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
              <div>
                <label className="label mb-2 text-sm sm:text-base">Sala *</label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  className="input w-full min-w-0 text-base touch-manipulation"
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
                  className="input w-full min-w-0 text-base"
                  required
                  placeholder="Npr. Tim meeting"
                />
              </div>
              <div>
                <label className="label mb-2 text-sm sm:text-base">Opis</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full min-w-0 text-base"
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
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-1 py-1.5">
                      Nema dostupnih korisnika ili nije moguće učitati listu korisnika.
                    </div>
                  ) : (
                    users.map(u => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-white/60 dark:hover:bg-gray-800 cursor-pointer text-sm touch-manipulation"
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
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <FiClock size={16} />
                    Početak *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="input w-full min-w-0 max-w-full text-base touch-manipulation"
                    required
                    step="900"
                  />
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
                    className="input w-full min-w-0 max-w-full text-base touch-manipulation"
                    required
                    step="900"
                  />
                </div>
              </div>
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
                    Kreiraj rezervaciju
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}







