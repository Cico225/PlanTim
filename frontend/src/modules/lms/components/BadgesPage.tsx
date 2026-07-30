import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiAward,
  FiStar,
  FiBook,
  FiCheckCircle,
  FiZap,
  FiGift,
  FiLock,
} from 'react-icons/fi';
import { lmsService, Badge } from '@/services/lmsService';
import toast from 'react-hot-toast';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: Math.min(i * 0.05, 0.45), ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function BadgesPage() {
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getBadges();
      setBadges(data.badges || []);
    } catch (error: unknown) {
      console.error('Failed to load badges:', error);
      toast.error('Neuspješno učitavanje bedževa');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'FiStar':
        return <FiStar className="h-8 w-8" />;
      case 'FiBook':
        return <FiBook className="h-8 w-8" />;
      case 'FiAward':
        return <FiAward className="h-8 w-8" />;
      case 'FiCheckCircle':
        return <FiCheckCircle className="h-8 w-8" />;
      case 'FiFire':
        return <FiZap className="h-8 w-8" />;
      case 'FiGift':
        return <FiGift className="h-8 w-8" />;
      default:
        return <FiAward className="h-8 w-8" />;
    }
  };

  const filteredBadges = badges.filter((badge) => {
    if (filter === 'earned') return badge.is_earned;
    if (filter === 'locked') return !badge.is_earned;
    return true;
  });

  const earnedCount = badges.filter((b) => b.is_earned).length;
  const totalCount = badges.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/50 to-amber-50/30 p-6 shadow-sm dark:border-orange-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
              Maloprodaja
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              <FiAward className="text-orange-500" />
              Bedževi
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Sakupljajte bedževe završavanjem kurseva i izazova.
            </p>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-dark-600 dark:bg-dark-900/50">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>Osvojeno</span>
              <span className="font-semibold text-orange-700 dark:text-orange-300">
                {earnedCount} / {totalCount}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-950/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ type: 'spring', stiffness: 70, damping: 18, delay: 0.2 }}
              />
            </div>
            <div className="mt-3 text-center text-2xl font-bold text-gray-900 dark:text-white">
              {progressPercent}%
            </div>
          </div>
        </div>
      </motion.div>

      <div className="inline-flex rounded-xl border border-orange-200/70 bg-white/80 p-1 shadow-sm dark:border-orange-900/40 dark:bg-dark-800">
        {(
          [
            { value: 'all', label: 'Svi' },
            { value: 'earned', label: 'Osvojeni' },
            { value: 'locked', label: 'Zaključani' },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === option.value
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-orange-50 dark:text-gray-300 dark:hover:bg-dark-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredBadges.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-16 text-center dark:border-orange-900/40 dark:bg-orange-950/20">
          <FiAward className="mx-auto mb-3 h-14 w-14 text-orange-400 opacity-70" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nema bedževa</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {filter === 'earned'
              ? 'Još nemate osvojenih bedževa. Nastavite učiti!'
              : 'Nema dostupnih bedževa.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBadges.map((badge, index) => (
            <motion.div
              key={badge.id}
              custom={index}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm ring-1 transition dark:bg-dark-800 ${
                badge.is_earned
                  ? 'border-orange-200 ring-orange-100 dark:border-orange-800 dark:ring-orange-900/40'
                  : 'border-transparent opacity-70 ring-gray-100 grayscale hover:opacity-100 hover:grayscale-0 dark:ring-dark-600'
              }`}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-400/5 to-transparent"
                aria-hidden
              />
              <div className="relative flex flex-col items-center text-center">
                <motion.div
                  className={`relative mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
                    badge.is_earned
                      ? 'text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400 dark:bg-dark-700'
                  }`}
                  style={badge.is_earned ? { backgroundColor: badge.color || '#f97316' } : {}}
                  animate={
                    badge.is_earned
                      ? {
                          boxShadow: [
                            '0 0 0 0 rgba(249,115,22,0.35)',
                            '0 0 0 12px rgba(249,115,22,0)',
                          ],
                        }
                      : undefined
                  }
                  transition={{ duration: 2.2, repeat: Infinity }}
                >
                  {getIcon(badge.icon)}
                  {!badge.is_earned && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35">
                      <FiLock className="h-6 w-6 text-white" />
                    </div>
                  )}
                </motion.div>

                <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">
                  {badge.name}
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{badge.description}</p>

                <div className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <FiStar className="h-4 w-4" />+{badge.points_reward} bodova
                </div>

                {badge.is_earned && badge.earned_at && (
                  <p className="mt-2 text-xs text-gray-500">
                    Osvojeno: {new Date(badge.earned_at).toLocaleDateString('hr-HR')}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl border border-orange-100/80 bg-gradient-to-br from-white via-white to-orange-50/40 p-5 shadow-sm dark:border-orange-900/30 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-6"
      >
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Vrste bedževa</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: FiCheckCircle,
              label: 'Kursevi',
              desc: 'Za završene kurseve',
              color: 'from-emerald-500 to-teal-500',
            },
            {
              icon: FiAward,
              label: 'Kvizovi',
              desc: 'Za položene kvizove',
              color: 'from-violet-500 to-indigo-500',
            },
            {
              icon: FiZap,
              label: 'Streak',
              desc: 'Za kontinuitet učenja',
              color: 'from-rose-500 to-orange-500',
            },
            {
              icon: FiStar,
              label: 'Bodovi',
              desc: 'Za sakupljene bodove',
              color: 'from-amber-500 to-yellow-500',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-sm`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
