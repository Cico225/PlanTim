import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { combineDateTimeParts, formatDate } from '@/utils/dateFormat';
import AppDatePicker from '@/components/AppDatePicker';

/** Working-hours slots every 15 minutes, 24h display (08:00–16:30). */
const MEETING_TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 8; h <= 16; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 16 && m > 30) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

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
    start_date: string;
    start_clock: string;
    end_date: string;
    end_clock: string;
    participants: number[];
  }>({
    room_id: '',
    title: '',
    description: '',
    start_date: '',
    start_clock: '',
    end_date: '',
    end_clock: '',
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
    const today = format(new Date(), 'dd.MM.yyyy');
    setFormData({
      room_id: selectedRoomId?.toString() || '',
      title: '',
      description: '',
      start_date: today,
      start_clock: '',
      end_date: today,
      end_clock: '',
      participants: [],
    });
    setShowReservationModal(true);
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    const start_time = combineDateTimeParts(formData.start_date, formData.start_clock);
    const end_time = combineDateTimeParts(formData.end_date, formData.end_clock);

    if (!start_time || !end_time) {
      toast.error('Unesite datum u formatu dd.mm.yyyy i vrijeme');
      return;
    }

    try {
      const payload = {
        room_id: parseInt(formData.room_id),
        title: formData.title,
        description: formData.description || null,
        start_time,
        end_time,
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card overflow-hidden border border-transparent p-0 transition-shadow hover:shadow-lg"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 to-primary-50/50 px-5 py-4 dark:border-dark-700 dark:from-indigo-900/15 dark:to-primary-900/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30"
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <FiCalendar className="text-primary-600 dark:text-primary-400" size={20} />
              </motion.div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Kalendar zauzetosti sala
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sedmični pregled rezervacija</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedRoomId || ''}
                onChange={(e) => setSelectedRoomId(parseInt(e.target.value))}
                className="input text-sm"
              >
                {rooms.map((room) => (
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
        </div>

        <div className="p-5">
        {/* Week Navigation */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-2 py-1 dark:bg-dark-900/40">
          <button
            onClick={() => navigateWeek('prev')}
            className="rounded-lg p-2 text-gray-700 transition hover:bg-white dark:text-gray-200 dark:hover:bg-dark-700"
          >
            <FiChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="font-medium text-gray-900 dark:text-white">
              {format(weekStart, 'dd.MM.yyyy')} - {formatDate(endOfWeek(currentDate, { weekStartsOn: 1 }))}
            </div>
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="rounded-lg p-2 text-gray-700 transition hover:bg-white dark:text-gray-200 dark:hover:bg-dark-700"
          >
            <FiChevronRight size={20} />
          </button>
        </div>

        {/* Week Calendar */}
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-7 sm:gap-2">
            {weekDays.map((day, index) => {
              const dayReservations = getReservationsForDay(day);
              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`rounded-xl border p-3 transition-all sm:min-h-[120px] sm:p-2 ${
                    isToday(day)
                      ? 'border-primary-300 bg-primary-50 shadow-sm ring-2 ring-primary-200/60 dark:border-primary-700 dark:bg-primary-900/20 dark:ring-primary-800/40'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 sm:block">
                    <div className={`text-sm font-medium sm:text-xs ${isToday(day) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      <span className="sm:hidden">{format(day, 'EEEE')}</span>
                      <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                    </div>
                    <div className={`text-base font-semibold sm:mb-2 sm:text-sm ${isToday(day) ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                      <span className="sm:hidden">{formatDate(day)}</span>
                      <span className="hidden sm:inline">{format(day, 'dd.MM')}</span>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-1">
                    {dayReservations.slice(0, 2).map((reservation) => (
                      <motion.div
                        key={reservation.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`rounded-lg border p-2 text-sm sm:truncate sm:p-1 sm:text-xs ${getReservationColor(reservation)}`}
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
                      </motion.div>
                    ))}
                    {dayReservations.length > 2 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 sm:text-xs">
                        +{dayReservations.length - 2} više
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-200 pt-4 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300 dark:bg-red-900/40 dark:border-red-600"></div>
            <span>Zauzeto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 dark:bg-yellow-900/40 dark:border-yellow-600"></div>
            <span>Moj sastanak</span>
          </div>
        </div>
        </div>
      </motion.div>

      {/* Reservation Modal */}
      <AnimatePresence>
      {showReservationModal && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-xl dark:bg-dark-800 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="shrink-0 border-b border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-800 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                  Nova rezervacija
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReservationModal(false)}
                  className="-mr-2 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700 dark:hover:text-gray-200 touch-manipulation"
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
                <div
                  className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-300 p-2 sm:p-3"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                >
                  {users.length === 0 ? (
                    <div className="px-1 py-1.5 text-xs" style={{ color: '#4b5563' }}>
                      Nema dostupnih korisnika ili nije moguće učitati listu korisnika.
                    </div>
                  ) : (
                    users.map(u => (
                      <label
                        key={u.id}
                        className="flex cursor-pointer touch-manipulation items-center gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-gray-100"
                        style={{ color: '#111827' }}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0 rounded border-gray-400"
                          style={{ backgroundColor: '#ffffff', accentColor: '#2563eb' }}
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
                        <span className="truncate" style={{ color: '#111827' }}>
                          {u.name || u.email}
                          {u.name && u.email ? ` (${u.email})` : ''}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <label className="label mb-0 flex items-center gap-2 text-sm sm:text-base">
                    <FiClock size={16} />
                    Početak *
                  </label>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Datum (dd.mm.yyyy)</label>
                    <AppDatePicker
                      value={formData.start_date}
                      onChange={(start_date) => setFormData({ ...formData, start_date })}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Vrijeme (24h)</label>
                    <select
                      value={formData.start_clock}
                      onChange={(e) => setFormData({ ...formData, start_clock: e.target.value })}
                      className="input w-full min-w-0 max-w-full text-base touch-manipulation"
                      required
                    >
                      <option value="">HH:mm</option>
                      {MEETING_TIME_OPTIONS.map(t => (
                        <option key={`start-${t}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="label mb-0 flex items-center gap-2 text-sm sm:text-base">
                    <FiClock size={16} />
                    Kraj *
                  </label>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Datum (dd.mm.yyyy)</label>
                    <AppDatePicker
                      value={formData.end_date}
                      onChange={(end_date) => setFormData({ ...formData, end_date })}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Vrijeme (24h)</label>
                    <select
                      value={formData.end_clock}
                      onChange={(e) => setFormData({ ...formData, end_clock: e.target.value })}
                      className="input w-full min-w-0 max-w-full text-base touch-manipulation"
                      required
                    >
                      <option value="">HH:mm</option>
                      {MEETING_TIME_OPTIONS.map(t => (
                        <option key={`end-${t}`} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              </div>
              <div className="shrink-0 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-dark-700 dark:bg-dark-800 sm:p-6">
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}