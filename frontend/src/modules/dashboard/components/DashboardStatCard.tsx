import type { ComponentType, ReactNode } from 'react';
import { motion } from 'framer-motion';
import DashboardStatAnimation, { type DashboardStatId } from './DashboardStatAnimation';

export type DashboardAccent = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'teal' | 'orange';

interface DashboardStatCardProps {
  name: string;
  slug: string;
  value: number | string;
  subtext: string;
  subtextColor?: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  statId: DashboardStatId;
  accent: DashboardAccent;
  delay?: number;
  detail?: ReactNode;
  onClick?: () => void;
}

const accentStyles: Record<
  DashboardAccent,
  { bg: string; icon: string; ring: string }
> = {
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
    ring: 'group-hover:ring-blue-200 dark:group-hover:ring-blue-900/50',
  },
  green: {
    bg: 'bg-green-500/10',
    icon: 'text-green-600 dark:text-green-400',
    ring: 'group-hover:ring-green-200 dark:group-hover:ring-green-900/50',
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    icon: 'text-yellow-600 dark:text-yellow-400',
    ring: 'group-hover:ring-yellow-200 dark:group-hover:ring-yellow-900/50',
  },
  red: {
    bg: 'bg-red-500/10',
    icon: 'text-red-600 dark:text-red-400',
    ring: 'group-hover:ring-red-200 dark:group-hover:ring-red-900/50',
  },
  purple: {
    bg: 'bg-purple-500/10',
    icon: 'text-purple-600 dark:text-purple-400',
    ring: 'group-hover:ring-purple-200 dark:group-hover:ring-purple-900/50',
  },
  teal: {
    bg: 'bg-teal-500/10',
    icon: 'text-teal-600 dark:text-teal-400',
    ring: 'group-hover:ring-teal-200 dark:group-hover:ring-teal-900/50',
  },
  orange: {
    bg: 'bg-orange-500/10',
    icon: 'text-orange-600 dark:text-orange-400',
    ring: 'group-hover:ring-orange-200 dark:group-hover:ring-orange-900/50',
  },
};

export default function DashboardStatCard({
  name,
  slug,
  value,
  subtext,
  subtextColor,
  icon: Icon,
  statId,
  accent,
  delay = 0,
  detail,
  onClick,
}: DashboardStatCardProps) {
  const styles = accentStyles[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="h-full"
    >
      <button
        type="button"
        onClick={onClick}
        className={`group card flex h-full min-h-[17.5rem] w-full flex-col overflow-hidden border border-transparent p-0 text-left transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 sm:min-h-[18rem] ${styles.ring}`}
      >
        <DashboardStatAnimation statId={statId} color={accent} className="mx-3 mt-3 shrink-0" />

        <div className="flex flex-1 flex-col p-4 pt-3 sm:p-5 sm:pt-4">
          <div className="mb-2 flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.bg}`}>
              <Icon className={styles.icon} size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">{name}</h3>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{slug}</p>
            </div>
          </div>

          <motion.p
            key={String(value)}
            className="text-3xl font-bold text-gray-900 dark:text-white"
            initial={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260 }}
          >
            {value}
          </motion.p>
          <p className={`mt-1 line-clamp-2 text-sm ${subtextColor || 'text-gray-600 dark:text-gray-400'}`}>
            {subtext}
          </p>

          {detail && <div className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{detail}</div>}

          <p className="mt-auto pt-3 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-400">
            Otvori →
          </p>
        </div>
      </button>
    </motion.div>
  );
}
