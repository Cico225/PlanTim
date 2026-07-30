import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiBook,
  FiFileText,
  FiHome,
  FiList,
  FiSettings,
  FiTrendingUp,
  FiShield,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useAuthStore } from '@/store/authStore';
import { lmsService } from '@/services/lmsService';
import { LMS_RETAIL_BASE, lmsRetailPath } from '../lmsPaths';

type Audience = 'all' | 'learner' | 'admin';

interface RetailPanel {
  id: string;
  path: string;
  title: string;
  subtitle: string;
  description: string;
  action: string;
  icon: IconType;
  color: PanelColor;
  audience: Audience;
  progressKey?: 'enrolled' | 'completed' | 'badges' | 'points';
}

type PanelColor =
  | 'emerald'
  | 'teal'
  | 'sky'
  | 'amber'
  | 'orange'
  | 'lime'
  | 'indigo'
  | 'rose';

const PANELS: RetailPanel[] = [
  {
    id: 'dashboard',
    path: lmsRetailPath('/dashboard'),
    title: 'Moj napredak',
    subtitle: 'Pregled',
    description: 'Statistike učenja, streak, bodovi i brzi uvid u aktivne kurseve.',
    action: 'Otvori pregled',
    icon: FiHome,
    color: 'emerald',
    audience: 'all',
    progressKey: 'points',
  },
  {
    id: 'katalog',
    path: lmsRetailPath('/katalog'),
    title: 'Katalog kurseva',
    subtitle: 'Svi kursevi',
    description: 'Pregledaj dostupne obuke za maloprodaju i upiši se na kurs.',
    action: 'Otvori katalog',
    icon: FiList,
    color: 'teal',
    audience: 'all',
  },
  {
    id: 'my-courses',
    path: lmsRetailPath('/my-courses'),
    title: 'Moji kursevi',
    subtitle: 'Učenje',
    description: 'Nastavi tamo gdje si stao — aktivni i završeni kursevi s napretkom.',
    action: 'Nastavi učenje',
    icon: FiBook,
    color: 'sky',
    audience: 'learner',
    progressKey: 'enrolled',
  },
  {
    id: 'leaderboard',
    path: lmsRetailPath('/leaderboard'),
    title: 'Ljestvica',
    subtitle: 'Rangiranje',
    description: 'Usporedi bodove s kolegama i prati rang na ljestvici.',
    action: 'Otvori ljestvicu',
    icon: FiTrendingUp,
    color: 'amber',
    audience: 'all',
    progressKey: 'points',
  },
  {
    id: 'badges',
    path: lmsRetailPath('/badges'),
    title: 'Bedževi',
    subtitle: 'Postignuća',
    description: 'Osvojeni bedževi i ciljevi koje još možeš otključati.',
    action: 'Otvori bedževe',
    icon: FiAward,
    color: 'orange',
    audience: 'all',
    progressKey: 'badges',
  },
  {
    id: 'certificates',
    path: lmsRetailPath('/certificates'),
    title: 'Certifikati',
    subtitle: 'Dokazi završetka',
    description: 'Preuzmi certifikate za završene kurseve.',
    action: 'Otvori certifikate',
    icon: FiFileText,
    color: 'lime',
    audience: 'all',
    progressKey: 'completed',
  },
  {
    id: 'manage',
    path: lmsRetailPath('/manage'),
    title: 'Upravljanje kursevima',
    subtitle: 'Administracija',
    description: 'Kreiraj i uređuj kurseve, lekcije, kvizove i iznenađenja za maloprodaju.',
    action: 'Upravljaj sadržajem',
    icon: FiSettings,
    color: 'indigo',
    audience: 'admin',
  },
  {
    id: 'reports',
    path: lmsRetailPath('/reports'),
    title: 'Izvještaji',
    subtitle: 'Analitika admin',
    description: 'Pregled napretka zaposlenika, završenosti kurseva i rezultata kvizova.',
    action: 'Otvori izvještaje',
    icon: FiBarChart2,
    color: 'rose',
    audience: 'admin',
  },
];

const colorStyles: Record<
  PanelColor,
  { bg: string; icon: string; ring: string; gradient: string; art: string }
> = {
  emerald: {
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    ring: 'group-hover:ring-emerald-200 dark:group-hover:ring-emerald-900/50',
    gradient: 'from-emerald-500/20 via-teal-400/10 to-green-300/10',
    art: '#10b981',
  },
  teal: {
    bg: 'bg-teal-500/10',
    icon: 'text-teal-600 dark:text-teal-400',
    ring: 'group-hover:ring-teal-200 dark:group-hover:ring-teal-900/50',
    gradient: 'from-teal-500/20 via-cyan-400/10 to-emerald-300/10',
    art: '#14b8a6',
  },
  sky: {
    bg: 'bg-sky-500/10',
    icon: 'text-sky-600 dark:text-sky-400',
    ring: 'group-hover:ring-sky-200 dark:group-hover:ring-sky-900/50',
    gradient: 'from-sky-500/20 via-blue-400/10 to-cyan-300/10',
    art: '#0ea5e9',
  },
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    ring: 'group-hover:ring-amber-200 dark:group-hover:ring-amber-900/50',
    gradient: 'from-amber-500/20 via-orange-400/10 to-yellow-300/10',
    art: '#f59e0b',
  },
  orange: {
    bg: 'bg-orange-500/10',
    icon: 'text-orange-600 dark:text-orange-400',
    ring: 'group-hover:ring-orange-200 dark:group-hover:ring-orange-900/50',
    gradient: 'from-orange-500/20 via-amber-400/10 to-yellow-300/10',
    art: '#f97316',
  },
  lime: {
    bg: 'bg-lime-500/10',
    icon: 'text-lime-700 dark:text-lime-400',
    ring: 'group-hover:ring-lime-200 dark:group-hover:ring-lime-900/50',
    gradient: 'from-lime-500/20 via-green-400/10 to-emerald-300/10',
    art: '#84cc16',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    icon: 'text-indigo-600 dark:text-indigo-400',
    ring: 'group-hover:ring-indigo-200 dark:group-hover:ring-indigo-900/50',
    gradient: 'from-indigo-500/20 via-violet-400/10 to-purple-300/10',
    art: '#6366f1',
  },
  rose: {
    bg: 'bg-rose-500/10',
    icon: 'text-rose-600 dark:text-rose-400',
    ring: 'group-hover:ring-rose-200 dark:group-hover:ring-rose-900/50',
    gradient: 'from-rose-500/20 via-pink-400/10 to-orange-300/10',
    art: '#f43f5e',
  },
};

/** Admin / manager role ili eksplicitno ovlaštenje za upravljanje LMS-om. */
export function useIsLmsAdmin() {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase() || '';
  const roles = (user as { roles?: string[] })?.roles || [];
  const hasRole =
    role === 'admin' ||
    role === 'manager' ||
    roles.some((r) => ['admin', 'manager'].includes(String(r).toLowerCase()));
  const hasPerm = user?.permissions?.some((p) => {
    const key = String(p).toLowerCase();
    return (
      key === 'lms.manage' ||
      key.includes('lms.manage') ||
      key === 'lms.create' ||
      key === 'lms.update' ||
      key.includes('lms.create') ||
      key.includes('lms.update')
    );
  });
  return Boolean(hasRole || hasPerm);
}

export default function LMSMaloprodajaLandingPage() {
  const navigate = useNavigate();
  const isAdmin = useIsLmsAdmin();
  const [tab, setTab] = useState<'maloprodaja' | 'admin'>('maloprodaja');

  const { data: dash } = useQuery({
    queryKey: ['lms-retail-landing-stats'],
    queryFn: () => lmsService.getDashboardStats(),
    staleTime: 60_000,
  });

  const stats = dash?.stats;
  const badgesEarned = (dash?.badges || []).filter((b: { is_earned?: boolean }) =>
    Boolean(b.is_earned)
  ).length;

  const learnerPanels = PANELS.filter((p) => p.audience !== 'admin');
  const adminPanels = isAdmin ? PANELS.filter((p) => p.audience === 'admin') : [];

  const progressLabel = (key?: RetailPanel['progressKey']) => {
    if (!key || !stats) return null;
    switch (key) {
      case 'enrolled':
        return `${stats.enrolled_courses} upisano`;
      case 'completed':
        return `${stats.completed_courses} završeno`;
      case 'badges':
        return `${badgesEarned} bedževa`;
      case 'points':
        return `${stats.total_points} bodova`;
      default:
        return null;
    }
  };

  const completionPct =
    stats && stats.enrolled_courses > 0
      ? Math.round((stats.completed_courses / stats.enrolled_courses) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/lms"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 sm:text-sm"
        >
          <FiArrowLeft size={14} />
          Sistem za učenje
        </Link>

        {adminPanels.length > 0 && (
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-dark-600 dark:bg-dark-800">
            <button
              type="button"
              onClick={() => setTab('maloprodaja')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === 'maloprodaja'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-dark-700'
              }`}
            >
              <FiHome size={15} />
              Maloprodaja
            </button>
            <button
              type="button"
              onClick={() => setTab('admin')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-dark-700'
              }`}
            >
              <FiShield size={15} />
              Upravljanje i izvještaji
            </button>
          </div>
        )}
      </div>

      {tab === 'maloprodaja' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/30 p-6 shadow-sm dark:border-emerald-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                  Maloprodaja
                </p>
                <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                  Put učenja
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
                  Odaberite modul na timelineu ili kartici ispod i pratite svoj napredak.
                </p>
              </div>

              {stats && (
                <div className="min-w-[200px] rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur dark:border-dark-600 dark:bg-dark-900/50">
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Završenost</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {completionPct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {stats.enrolled_courses}
                      </div>
                      <div className="text-[10px] text-gray-500">Upisano</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {stats.completed_courses}
                      </div>
                      <div className="text-[10px] text-gray-500">Završeno</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {stats.total_points}
                      </div>
                      <div className="text-[10px] text-gray-500">Bodovi</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <HorizontalTimeline
              panels={learnerPanels}
              onOpen={(path) => navigate(path)}
              tone="learner"
            />
          </div>

          <PanelGrid
            panels={learnerPanels}
            progressLabel={progressLabel}
            onOpen={(path) => navigate(path)}
          />
        </div>
      )}

      {tab === 'admin' && adminPanels.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/25 p-6 shadow-sm dark:border-indigo-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                <FiShield size={12} />
                Administracija
              </span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Samo korisnici s ovlaštenjem za upravljanje LMS-om
              </p>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Upravljanje i izvještaji
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              Kreiranje kurseva, lekcija i kvizova te analitika napretka zaposlenika.
            </p>

            <HorizontalTimeline
              panels={adminPanels}
              onOpen={(path) => navigate(path)}
              tone="admin"
            />
          </div>

          <PanelGrid
            panels={adminPanels}
            progressLabel={progressLabel}
            onOpen={(path) => navigate(path)}
            admin
          />
        </div>
      )}
    </div>
  );
}

function HorizontalTimeline({
  panels,
  onOpen,
  tone,
}: {
  panels: RetailPanel[];
  onOpen: (path: string) => void;
  tone: 'learner' | 'admin';
}) {
  const isAdmin = tone === 'admin';
  const lineClass = isAdmin
    ? 'from-indigo-300 via-violet-300 to-indigo-200 dark:from-indigo-800 dark:via-violet-700 dark:to-indigo-900'
    : 'from-emerald-300 via-teal-300 to-emerald-200 dark:from-emerald-800 dark:via-teal-700 dark:to-emerald-900';
  const nodeClass = isAdmin
    ? 'border-indigo-300 bg-indigo-50 text-indigo-800 group-hover:border-indigo-500 group-hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200'
    : 'border-emerald-300 bg-white text-emerald-800 group-hover:border-emerald-500 group-hover:bg-emerald-50 dark:border-emerald-800 dark:bg-dark-800 dark:text-emerald-200';

  return (
    <div className="mt-5 rounded-2xl border border-white/60 bg-white/55 px-2 py-3 backdrop-blur-sm dark:border-white/5 dark:bg-dark-900/20 sm:px-3 sm:py-4">
      <div className="relative">
        <div
          className={`pointer-events-none absolute left-[4%] right-[4%] top-1/2 z-0 h-[2px] -translate-y-1/2 bg-gradient-to-r ${lineClass}`}
          aria-hidden
        />
        <div className="relative z-10 flex w-full flex-nowrap items-stretch">
          {panels.map((panel, index) => {
            const textBelow = index % 2 === 0;
            const labelClass = isAdmin
              ? 'line-clamp-2 max-w-full px-0.5 text-center text-[10px] font-semibold leading-tight text-gray-700 transition group-hover:text-indigo-700 dark:text-gray-200 dark:group-hover:text-indigo-300 sm:text-[11px] sm:leading-snug'
              : 'line-clamp-2 max-w-full px-0.5 text-center text-[10px] font-semibold leading-tight text-gray-700 transition group-hover:text-emerald-700 dark:text-gray-200 dark:group-hover:text-emerald-300 sm:text-[11px] sm:leading-snug';

            return (
              <button
                key={panel.id}
                type="button"
                onClick={() => onOpen(panel.path)}
                className="group flex min-w-0 flex-1 flex-col items-center"
                title={panel.title}
              >
                <div className="flex min-h-[1.6rem] flex-1 items-end justify-center sm:min-h-[1.85rem]">
                  {!textBelow && <p className={labelClass}>{panel.title}</p>}
                </div>

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold shadow-md transition group-hover:scale-110 sm:h-10 sm:w-10 sm:text-base ${nodeClass}`}
                >
                  {index + 1}
                </div>

                <div className="flex min-h-[1.6rem] flex-1 items-start justify-center sm:min-h-[1.85rem]">
                  {textBelow && <p className={labelClass}>{panel.title}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PanelGrid({
  panels,
  progressLabel,
  onOpen,
  admin = false,
}: {
  panels: RetailPanel[];
  progressLabel: (key?: RetailPanel['progressKey']) => string | null;
  onOpen: (path: string) => void;
  admin?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${admin ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
      {panels.map((panel, index) => {
        const styles = colorStyles[panel.color];
        const Icon = panel.icon;
        const metric = progressLabel(panel.progressKey);

        return (
          <motion.button
            key={panel.id}
            type="button"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.45) }}
            onClick={() => onOpen(panel.path)}
            className={`group card relative flex h-full flex-col overflow-hidden border border-transparent p-0 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 ${styles.ring}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-80`} />
            <LMSPanelArt
              id={panel.id}
              color={styles.art}
              className="relative mx-3 mt-3 h-24 rounded-2xl border border-white/40 bg-white/70 p-2 shadow-sm backdrop-blur dark:border-white/5 dark:bg-dark-900/40"
            />

            <div className="relative flex flex-1 flex-col p-4 pt-3">
              <div className="mb-2 flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-white/40 ${styles.bg}`}
                >
                  <Icon className={styles.icon} size={17} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">
                      {panel.title}
                    </h3>
                    {admin && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-600/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                        <FiShield size={9} />
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {panel.subtitle}
                  </p>
                </div>
              </div>
              <p className="text-[12px] leading-relaxed text-gray-600 dark:text-gray-400">
                {panel.description}
              </p>
              {metric && <p className={`mt-2 text-xs font-semibold ${styles.icon}`}>{metric}</p>}
              <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-primary-600 transition-transform group-hover:translate-x-1 dark:text-primary-400">
                {panel.action}
                <FiArrowRight size={14} />
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function LMSPanelArt({
  id,
  color,
  className = '',
}: {
  id: string;
  color: string;
  className?: string;
}) {
  const soft = `${color}22`;

  if (id === 'dashboard') {
    const bars = [36, 52, 28, 44, 38];
    return (
      <div className={className}>
        <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
          <rect x="12" y="10" width="176" height="60" rx="14" fill={soft} />
          {bars.map((h, i) => (
            <motion.rect
              key={i}
              x={36 + i * 28}
              width="16"
              rx="4"
              fill={color}
              initial={{ height: 12, y: 58 }}
              animate={{ height: [12, h, 12 + h * 0.7, h], y: [58, 58 - h, 58 - h * 0.7, 58 - h] }}
              transition={{ duration: 2.4, delay: i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </svg>
      </div>
    );
  }

  if (id === 'katalog' || id === 'my-courses') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
          <rect x="12" y="10" width="176" height="60" rx="14" fill={soft} />
          {[0, 1, 2].map((i) => (
            <motion.g
              key={i}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect x={28 + i * 54} y="22" width="44" height="40" rx="8" fill="white" />
              <rect x={36 + i * 54} y="30" width="28" height="5" rx="2.5" fill={color} />
              <rect x={36 + i * 54} y="40" width="20" height="4" rx="2" fill={`${color}55`} />
              <circle cx={50 + i * 54} cy="52" r="5" fill={color} opacity={0.85} />
            </motion.g>
          ))}
        </svg>
      </div>
    );
  }

  if (id === 'leaderboard') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
          <rect x="12" y="10" width="176" height="60" rx="14" fill={soft} />
          {[40, 56, 34].map((h, i) => (
            <motion.rect
              key={i}
              x={58 + i * 32}
              width="22"
              rx="5"
              fill={color}
              opacity={1 - i * 0.15}
              initial={{ height: 10, y: 58 }}
              animate={{ height: h, y: 58 - h }}
              transition={{ duration: 1.6, delay: i * 0.15, repeat: Infinity, repeatType: 'mirror' }}
            />
          ))}
        </svg>
      </div>
    );
  }

  if (id === 'badges' || id === 'certificates') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
          <rect x="12" y="10" width="176" height="60" rx="14" fill={soft} />
          <motion.circle
            cx="100"
            cy="40"
            r="18"
            fill="white"
            stroke={color}
            strokeWidth="3"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M92 40 l5 5 11-12"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    );
  }

  if (id === 'manage' || id === 'reports') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
          <rect x="12" y="10" width="176" height="60" rx="14" fill={soft} />
          {[0, 1, 2].map((i) => (
            <motion.rect
              key={i}
              x="36"
              y={22 + i * 16}
              height="10"
              rx="5"
              fill="white"
              animate={{ width: [70 + i * 10, 110 - i * 8, 70 + i * 10] }}
              transition={{ duration: 2.4, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          <motion.circle
            cx="160"
            cy="40"
            r="12"
            fill={color}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        </svg>
      </div>
    );
  }

  // default decorative art
  return (
    <div className={className}>
      <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
        <rect x="12" y="10" width="176" height="60" rx="14" fill={soft} />
        <motion.circle
          cx="100"
          cy="40"
          r="16"
          fill={color}
          opacity={0.35}
          animate={{ r: [14, 18, 14], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
        <motion.circle
          cx="100"
          cy="40"
          r="8"
          fill={color}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}

export { PANELS as LMS_RETAIL_PANELS, LMS_RETAIL_BASE };
