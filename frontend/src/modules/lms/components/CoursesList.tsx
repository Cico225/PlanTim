import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiBook,
  FiClock,
  FiUser,
  FiStar,
  FiArrowRight,
  FiFilter,
  FiSearch,
} from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { lmsService, Course } from '@/services/lmsService';
import toast from 'react-hot-toast';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: Math.min(i * 0.05, 0.45), ease: [0.22, 1, 0.36, 1] },
  }),
};

const coverGradients = [
  'from-teal-500 via-emerald-500 to-cyan-600',
  'from-emerald-500 via-teal-500 to-lime-500',
  'from-cyan-500 via-sky-500 to-teal-600',
  'from-lime-500 via-emerald-500 to-teal-600',
  'from-sky-500 via-teal-500 to-emerald-600',
];

export default function CoursesList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    level: '',
  });

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    loadCourses();
  }, [filters]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await lmsService.getCourses({
        ...filters,
        published: isManager ? undefined : true,
      });
      setCourses(response.data || []);
    } catch (error: unknown) {
      console.error('Failed to load courses:', error);
      toast.error('Neuspješno učitavanje kurseva');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const getLevelStyle = (level: string) => {
    const styles: Record<string, string> = {
      beginner:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
      intermediate:
        'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
      advanced: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
    };
    return styles[level] || 'bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-200';
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: 'Početnički',
      intermediate: 'Srednji',
      advanced: 'Napredni',
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/50 to-emerald-50/30 p-6 shadow-sm dark:border-teal-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Maloprodaja
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Katalog kurseva
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Pregledaj dostupne obuke za maloprodaju i upiši se na kurs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/lms/maloprodaja/my-courses')}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white/80 px-4 py-2 text-sm font-medium text-teal-800 shadow-sm transition hover:bg-teal-50 dark:border-teal-800 dark:bg-dark-900/50 dark:text-teal-200 dark:hover:bg-dark-700"
            >
              Moji kursevi
            </button>
          </div>
        </div>

        {/* Mini catalog art */}
        <div className="relative mt-5 hidden h-14 sm:block">
          <svg viewBox="0 0 360 56" className="h-full w-full" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.g
                key={i}
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.2, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
              >
                <rect
                  x={28 + i * 66}
                  y="10"
                  width="48"
                  height="36"
                  rx="8"
                  fill="#14b8a6"
                  opacity={0.18 + i * 0.08}
                />
                <rect x={36 + i * 66} y="18" width="32" height="5" rx="2.5" fill="#0d9488" />
                <rect
                  x={36 + i * 66}
                  y="28"
                  width="22"
                  height="4"
                  rx="2"
                  fill="#14b8a6"
                  opacity="0.45"
                />
              </motion.g>
            ))}
          </svg>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="flex flex-col gap-3 rounded-2xl border border-teal-100/80 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-teal-900/30 dark:bg-dark-800 sm:flex-row sm:items-center sm:p-4"
      >
        <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <FiFilter size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Filteri</span>
        </div>

        <div className="relative min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretraži kurseve..."
            className="input w-full pl-9"
          />
        </div>

        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="input w-full sm:w-auto sm:min-w-[10rem]"
        >
          <option value="">Sve kategorije</option>
          <option value="it">IT</option>
          <option value="business">Biznis</option>
          <option value="marketing">Marketing</option>
          <option value="design">Dizajn</option>
        </select>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="input w-full sm:w-auto sm:min-w-[10rem]"
        >
          <option value="">Svi nivoi</option>
          <option value="beginner">Početnički</option>
          <option value="intermediate">Srednji</option>
          <option value="advanced">Napredni</option>
        </select>
      </motion.div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {filteredCourses.length}{' '}
          {filteredCourses.length === 1 ? 'kurs' : 'kurseva'}
        </span>
      </div>

      {/* Courses grid */}
      {filteredCourses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-dashed border-teal-200 bg-teal-50/40 px-6 py-16 text-center dark:border-teal-900/40 dark:bg-teal-950/20"
        >
          <FiBook className="mx-auto mb-3 h-14 w-14 text-teal-400 opacity-70" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nema dostupnih kurseva
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Trenutno nema kurseva koji zadovoljavaju vaše kriterije.
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course, index) => {
            const coverGradient = coverGradients[index % coverGradients.length];

            return (
              <motion.button
                key={course.id}
                type="button"
                custom={index}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                whileHover={{ y: -5 }}
                onClick={() => navigate(`/lms/maloprodaja/courses/${course.id}`)}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-transparent bg-white text-left shadow-sm ring-1 ring-teal-100/70 transition hover:shadow-xl hover:ring-2 hover:ring-teal-200 dark:bg-dark-800 dark:ring-teal-900/40 dark:hover:ring-teal-700/50"
              >
                <div className="relative h-40 overflow-hidden sm:h-44">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className={`relative flex h-full items-center justify-center bg-gradient-to-br ${coverGradient}`}
                    >
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage:
                            'radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 70%, white 0, transparent 35%)',
                        }}
                      />
                      <FiBook className="relative h-12 w-12 text-white/60" />
                      {/* floating mini cards */}
                      <motion.div
                        className="absolute bottom-4 left-4 h-10 w-14 rounded-lg bg-white/25 backdrop-blur-sm"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <motion.div
                        className="absolute bottom-6 left-16 h-8 w-12 rounded-lg bg-white/20 backdrop-blur-sm"
                        animate={{ y: [0, -3, 0] }}
                        transition={{
                          duration: 2.2,
                          delay: 0.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />

                  {course.is_featured && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow-sm">
                      <FiStar className="h-3 w-3" />
                      Istaknuto
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getLevelStyle(course.level)}`}
                    >
                      {getLevelLabel(course.level)}
                    </span>
                    {course.category && (
                      <span className="truncate text-[11px] uppercase tracking-wide text-gray-400">
                        {course.category}
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-[15px] font-semibold text-gray-900 transition group-hover:text-teal-700 dark:text-white dark:group-hover:text-teal-300 sm:text-base">
                    {course.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {course.description || 'Nema opisa'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {(course.duration || course.duration === 0) && (
                      <span className="inline-flex items-center gap-1">
                        <FiClock className="h-3.5 w-3.5" />
                        {course.duration}h
                      </span>
                    )}
                    {course.lessons_count !== undefined && course.lessons_count > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <FiBook className="h-3.5 w-3.5" />
                        {course.lessons_count} lekcija
                      </span>
                    )}
                    {course.enrollments_count !== undefined && course.enrollments_count > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <FiUser className="h-3.5 w-3.5" />
                        {course.enrollments_count}
                      </span>
                    )}
                  </div>

                  {course.instructor && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <FiUser className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{course.instructor.name}</span>
                    </div>
                  )}

                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 transition group-hover:translate-x-1 dark:text-teal-400">
                    Pregledaj kurs
                    <FiArrowRight size={14} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
