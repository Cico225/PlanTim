import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiBook,
  FiAward,
  FiTrendingUp,
  FiTarget,
  FiZap,
  FiCheckCircle,
  FiStar,
  FiBarChart2,
  FiArrowRight,
  FiList,
} from 'react-icons/fi';
import { lmsService, Badge } from '@/services/lmsService';
import toast from 'react-hot-toast';

interface DashboardStats {
  enrolled_courses: number;
  completed_courses: number;
  lessons_completed: number;
  quizzes_passed: number;
  average_score: number;
  total_points: number;
  current_streak: number;
}

interface RecentCourse {
  id: number;
  title: string;
  progress: number;
  enrolled_at: string;
  completed_at?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: Math.min(i * 0.06, 0.5), ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function LMSDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getDashboardStats();
      setStats(data.stats);
      setRecentCourses(data.recent_courses || []);
      setBadges(data.badges || []);
    } catch (error: unknown) {
      console.error('Failed to load dashboard:', error);
      toast.error('Neuspješno učitavanje napretka');
    } finally {
      setLoading(false);
    }
  };

  const completionPct =
    stats && stats.enrolled_courses > 0
      ? Math.round((stats.completed_courses / stats.enrolled_courses) * 100)
      : 0;

  const earnedBadges = badges.filter((b) => b.is_earned);
  const displayBadges = (earnedBadges.length > 0 ? earnedBadges : badges).slice(0, 8);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Upisani kursevi',
      value: stats?.enrolled_courses || 0,
      icon: FiBook,
      accent: 'from-emerald-500 to-teal-500',
      soft: 'from-emerald-500/15 via-teal-400/10 to-transparent',
      ring: 'ring-emerald-200/60 dark:ring-emerald-900/40',
    },
    {
      label: 'Završeni kursevi',
      value: stats?.completed_courses || 0,
      icon: FiCheckCircle,
      accent: 'from-teal-500 to-cyan-500',
      soft: 'from-teal-500/15 via-cyan-400/10 to-transparent',
      ring: 'ring-teal-200/60 dark:ring-teal-900/40',
    },
    {
      label: 'Završene lekcije',
      value: stats?.lessons_completed || 0,
      icon: FiTarget,
      accent: 'from-sky-500 to-blue-500',
      soft: 'from-sky-500/15 via-blue-400/10 to-transparent',
      ring: 'ring-sky-200/60 dark:ring-sky-900/40',
    },
    {
      label: 'Položeni kvizovi',
      value: stats?.quizzes_passed || 0,
      icon: FiAward,
      accent: 'from-amber-500 to-orange-500',
      soft: 'from-amber-500/15 via-orange-400/10 to-transparent',
      ring: 'ring-amber-200/60 dark:ring-amber-900/40',
    },
    {
      label: 'Prosječna ocjena',
      value: `${stats?.average_score || 0}%`,
      icon: FiBarChart2,
      accent: 'from-lime-500 to-emerald-500',
      soft: 'from-lime-500/15 via-emerald-400/10 to-transparent',
      ring: 'ring-lime-200/60 dark:ring-lime-900/40',
    },
    {
      label: 'Ukupno bodova',
      value: stats?.total_points || 0,
      icon: FiStar,
      accent: 'from-orange-500 to-rose-500',
      soft: 'from-orange-500/15 via-rose-400/10 to-transparent',
      ring: 'ring-orange-200/60 dark:ring-orange-900/40',
    },
  ];

  const quickActions = [
    {
      label: 'Katalog',
      path: '/lms/maloprodaja/katalog',
      icon: FiList,
      gradient: 'from-teal-500 to-emerald-600',
    },
    {
      label: 'Ljestvica',
      path: '/lms/maloprodaja/leaderboard',
      icon: FiTrendingUp,
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      label: 'Bedževi',
      path: '/lms/maloprodaja/badges',
      icon: FiAward,
      gradient: 'from-orange-500 to-rose-500',
    },
    {
      label: 'Certifikati',
      path: '/lms/maloprodaja/certificates',
      icon: FiCheckCircle,
      gradient: 'from-lime-500 to-emerald-600',
    },
  ];

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/30 p-6 shadow-sm dark:border-emerald-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-teal-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Maloprodaja
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Moj napredak
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Statistike učenja, streak, bodovi i brzi uvid u aktivne kurseve.
            </p>

            {stats && stats.current_streak > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 16 }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/25"
              >
                <motion.span
                  animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FiZap className="h-4 w-4" />
                </motion.span>
                {stats.current_streak} dana zaredom
              </motion.div>
            )}
          </div>

          <div className="min-w-[220px] rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-dark-600 dark:bg-dark-900/50">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>Završenost kurseva</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {completionPct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.2 }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {stats?.enrolled_courses ?? 0}
                </div>
                <div className="text-[10px] text-gray-500">Upisano</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {stats?.completed_courses ?? 0}
                </div>
                <div className="text-[10px] text-gray-500">Završeno</div>
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {stats?.total_points ?? 0}
                </div>
                <div className="text-[10px] text-gray-500">Bodovi</div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated spark bars */}
        <div className="relative mt-6 hidden h-16 sm:block">
          <svg viewBox="0 0 400 64" className="h-full w-full" aria-hidden>
            {[28, 44, 22, 52, 36, 48, 30, 40].map((h, i) => (
              <motion.rect
                key={i}
                x={24 + i * 46}
                width="18"
                rx="6"
                fill="#10b981"
                opacity={0.35 + (i % 3) * 0.15}
                initial={{ height: 8, y: 52 }}
                animate={{
                  height: [10, h, 14 + h * 0.65, h],
                  y: [52, 56 - h, 56 - h * 0.65, 56 - h],
                }}
                transition={{
                  duration: 2.6,
                  delay: i * 0.1,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </svg>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              custom={index}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`relative overflow-hidden rounded-2xl border border-white/60 bg-white p-4 shadow-sm ring-1 dark:border-dark-600 dark:bg-dark-800 ${stat.ring}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.soft}`}
                aria-hidden
              />
              <div className="relative">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.accent} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <motion.div
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + index * 0.05, type: 'spring', stiffness: 180 }}
                >
                  {stat.value}
                </motion.div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent courses */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-white via-white to-emerald-50/40 p-5 shadow-sm dark:border-emerald-900/30 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nedavni kursevi
              </h2>
              <p className="text-xs text-gray-500">Nastavi tamo gdje si stao</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/lms/maloprodaja/my-courses')}
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-400"
            >
              Prikaži sve
              <FiArrowRight size={14} />
            </button>
          </div>

          {recentCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-10 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <FiBook className="mx-auto mb-2 h-10 w-10 text-emerald-400 opacity-70" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Niste upisani u nijedan kurs</p>
              <button
                type="button"
                onClick={() => navigate('/lms/maloprodaja/katalog')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
              >
                Pronađi kurseve
                <FiArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentCourses.map((course, index) => (
                <motion.button
                  key={course.id}
                  type="button"
                  custom={index}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  onClick={() => navigate(`/lms/maloprodaja/courses/${course.id}`)}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-white/80 p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:bg-dark-900/40 dark:hover:border-emerald-800"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                    <FiBook size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                      {course.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 max-w-[9rem] flex-1 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${course.progress}%` }}
                          transition={{ delay: 0.25 + index * 0.05, duration: 0.6 }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500">{course.progress}%</span>
                    </div>
                  </div>
                  {course.completed_at ? (
                    <FiCheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <FiArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </motion.section>

        {/* Badges */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="rounded-3xl border border-amber-100/80 bg-gradient-to-br from-white via-white to-amber-50/40 p-5 shadow-sm dark:border-amber-900/30 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Osvojeni bedževi
              </h2>
              <p className="text-xs text-gray-500">
                {earnedBadges.length > 0
                  ? `${earnedBadges.length} osvojeno`
                  : 'Postignuća koja te čekaju'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/lms/maloprodaja/badges')}
              className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 transition hover:text-amber-900 dark:text-amber-400"
            >
              Prikaži sve
              <FiArrowRight size={14} />
            </button>
          </div>

          {displayBadges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-10 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
              <FiAward className="mx-auto mb-2 h-10 w-10 text-amber-400 opacity-70" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Još nemate osvojenih bedževa</p>
              <p className="mt-1 text-xs text-gray-500">Nastavite učiti da osvojite prvi bedž!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {displayBadges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  custom={index}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  whileHover={{ y: -3, scale: 1.03 }}
                  className="flex flex-col items-center rounded-2xl border border-white/70 bg-white/80 p-3 shadow-sm dark:border-dark-600 dark:bg-dark-900/40"
                  title={badge.description}
                >
                  <motion.div
                    className="mb-2 flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-md"
                    style={{ backgroundColor: badge.color || '#10b981' }}
                    animate={
                      badge.is_earned
                        ? { boxShadow: ['0 0 0 0 rgba(16,185,129,0.35)', '0 0 0 10px rgba(16,185,129,0)'] }
                        : undefined
                    }
                    transition={{ duration: 2.2, repeat: Infinity }}
                  >
                    {badge.icon === 'FiStar' && <FiStar />}
                    {badge.icon === 'FiBook' && <FiBook />}
                    {badge.icon === 'FiAward' && <FiAward />}
                    {badge.icon === 'FiCheckCircle' && <FiCheckCircle />}
                    {badge.icon === 'FiFire' && <FiZap />}
                    {badge.icon === 'FiGift' && <FiStar />}
                    {!badge.icon && <FiAward />}
                  </motion.div>
                  <span className="line-clamp-2 text-center text-[11px] font-semibold text-gray-900 dark:text-white">
                    {badge.name}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.path}
              type="button"
              custom={index}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(action.path)}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-4 text-left text-white shadow-md`}
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl transition group-hover:bg-white/25"
                aria-hidden
              />
              <Icon className="relative mb-2 h-7 w-7" />
              <div className="relative flex items-center justify-between gap-2">
                <span className="font-semibold">{action.label}</span>
                <FiArrowRight className="h-4 w-4 opacity-80 transition group-hover:translate-x-1" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
