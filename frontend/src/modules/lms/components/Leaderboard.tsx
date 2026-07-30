import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAward, FiStar } from 'react-icons/fi';
import { lmsService } from '@/services/lmsService';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface LeaderboardEntry {
  id: number;
  name: string;
  total_points: number;
  rank: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: Math.min(i * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Leaderboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getLeaderboard(period, 20);
      setLeaderboard(data.leaderboard || []);
      setCurrentUserRank(data.current_user_rank || null);
    } catch (error: unknown) {
      console.error('Failed to load leaderboard:', error);
      toast.error('Neuspješno učitavanje ljestvice');
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 shadow-amber-400/30';
      case 2:
        return 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800 shadow-slate-400/30';
      case 3:
        return 'bg-gradient-to-br from-orange-500 to-amber-700 text-white shadow-orange-500/30';
      default:
        return 'bg-white text-amber-800 ring-1 ring-amber-100 dark:bg-dark-900 dark:text-amber-200 dark:ring-amber-900/40';
    }
  };

  const myPoints = leaderboard.find((e) => e.id === user?.id)?.total_points || 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/30 p-6 shadow-sm dark:border-amber-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-orange-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              Maloprodaja
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              <FiTrendingUp className="text-amber-500" />
              Ljestvica
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Rang lista korisnika po osvojenim bodovima.
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-amber-200/70 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-amber-900/40 dark:bg-dark-900/50">
            {(
              [
                { value: 'week', label: 'Sedmica' },
                { value: 'month', label: 'Mjesec' },
                { value: 'all', label: 'Ukupno' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                  period === option.value
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-amber-50 dark:text-gray-300 dark:hover:bg-dark-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {currentUserRank && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative mt-6 grid gap-4 rounded-2xl border border-white/60 bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-lg shadow-amber-500/20 sm:grid-cols-2 sm:p-5"
          >
            <div>
              <p className="text-sm text-amber-100">Vaša pozicija</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold sm:text-4xl">#{currentUserRank}</span>
                <span className="text-sm text-amber-100">od {leaderboard.length} korisnika</span>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-amber-100">Vaši bodovi</p>
              <div className="mt-1 flex items-center gap-2 sm:justify-end">
                <FiStar className="h-5 w-5" />
                <span className="text-2xl font-bold sm:text-3xl">{myPoints.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="overflow-hidden rounded-3xl border border-amber-100/80 bg-gradient-to-br from-white via-white to-amber-50/40 shadow-sm dark:border-amber-900/30 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900"
      >
        {leaderboard.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FiAward className="mx-auto mb-3 h-14 w-14 text-amber-400 opacity-70" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nema podataka</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Još nema korisnika na ljestvici za odabrani period.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-amber-100/80 dark:divide-amber-900/30">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.id === user?.id;

              return (
                <motion.div
                  key={entry.id}
                  custom={index}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  className={`flex items-center gap-3 p-3 sm:p-4 ${
                    isCurrentUser
                      ? 'bg-amber-50/80 dark:bg-amber-950/30'
                      : 'hover:bg-amber-50/40 dark:hover:bg-dark-900/40'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md sm:h-12 sm:w-12 sm:text-base ${getRankStyle(entry.rank)}`}
                  >
                    {entry.rank}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className={`truncate font-semibold ${
                        isCurrentUser
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {entry.name}
                      {isCurrentUser && (
                        <span className="ml-1 text-sm font-normal text-amber-600/80">(Vi)</span>
                      )}
                    </h3>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 text-right">
                    <FiStar
                      className={`h-4 w-4 ${entry.rank <= 3 ? 'text-amber-500' : 'text-gray-400'}`}
                    />
                    <span className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                      {entry.total_points.toLocaleString()}
                    </span>
                    <span className="hidden text-sm text-gray-500 sm:inline">bodova</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-amber-100/80 bg-white/80 p-5 shadow-sm dark:border-amber-900/30 dark:bg-dark-800"
      >
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Kako osvojiti bodove?</h3>
        <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
          <li>
            Završite lekciju: <span className="font-medium text-amber-700 dark:text-amber-300">+10 bodova</span>
          </li>
          <li>
            Položite kviz: <span className="font-medium text-amber-700 dark:text-amber-300">+20 bodova</span>
          </li>
          <li>
            Završite kurs: <span className="font-medium text-amber-700 dark:text-amber-300">+50 bodova</span>
          </li>
          <li>
            Pogledajte video do kraja:{' '}
            <span className="font-medium text-amber-700 dark:text-amber-300">+5 bodova</span>
          </li>
          <li>
            Osvojite bedž:{' '}
            <span className="font-medium text-amber-700 dark:text-amber-300">+10–500 bodova</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
