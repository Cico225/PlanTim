import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { FiActivity, FiCalendar, FiUsers, FiClock } from 'react-icons/fi';

interface ActivityOverviewAnimationProps {
  className?: string;
}

export default function ActivityOverviewAnimation({ className = '' }: ActivityOverviewAnimationProps) {
  const pulseDots = [
    { x: 24, delay: 0 },
    { x: 52, delay: 0.3 },
    { x: 80, delay: 0.6 },
    { x: 108, delay: 0.9 },
    { x: 136, delay: 1.2 },
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.08) 60%, transparent)',
      }}
    >
      <motion.div
        className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary-400/20 blur-2xl"
        animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-indigo-400/15 blur-2xl"
        animate={{ scale: [1.1, 0.9, 1.1] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

      <div className="relative flex h-36 items-center justify-between gap-4 px-6 py-4 sm:h-40">
        <div className="min-w-0 flex-1">
          <motion.div
            className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FiActivity size={12} />
            Live feed
          </motion.div>
          <motion.p
            className="text-sm text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Praćenje korisničkih akcija, sistema i rezervacija sala u realnom vremenu
          </motion.p>
          <motion.div
            className="mt-4 flex flex-wrap gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {[
              { icon: FiUsers, label: 'Korisnici' },
              { icon: FiCalendar, label: 'Sastanci' },
              { icon: FiClock, label: 'Timeline' },
            ].map(({ icon: Icon, label }, index) => (
              <motion.span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-medium text-gray-700 backdrop-blur-sm dark:bg-dark-800/60 dark:text-gray-200"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2.5, delay: index * 0.2, repeat: Infinity }}
              >
                <Icon size={12} className="text-primary-500" />
                {label}
              </motion.span>
            ))}
          </motion.div>
        </div>

        <svg viewBox="0 0 160 80" className="hidden h-24 w-40 shrink-0 sm:block" aria-hidden>
          <motion.path
            d="M8 52 L28 44 L48 48 L68 30 L88 36 L108 22 L128 28 L152 18"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.4 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
          {pulseDots.map((dot, index) => (
            <motion.circle
              key={index}
              cx={dot.x}
              cy={38 - (index % 3) * 8}
              r="4"
              fill="#3b82f6"
              animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, delay: dot.delay, repeat: Infinity }}
            />
          ))}
          <motion.rect
            x="118"
            y="54"
            width="32"
            height="8"
            rx="4"
            fill="#818cf8"
            opacity={0.45}
            animate={{ scaleX: [0.85, 1, 0.85] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{ transformOrigin: '134px 58px' }}
          />
        </svg>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: 'blue' | 'green' | 'purple';
  delay?: number;
}

const statColors = {
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
    ring: 'group-hover:ring-blue-200 dark:group-hover:ring-blue-900/40',
  },
  green: {
    bg: 'bg-green-500/10',
    icon: 'text-green-600 dark:text-green-400',
    ring: 'group-hover:ring-green-200 dark:group-hover:ring-green-900/40',
  },
  purple: {
    bg: 'bg-purple-500/10',
    icon: 'text-purple-600 dark:text-purple-400',
    ring: 'group-hover:ring-purple-200 dark:group-hover:ring-purple-900/40',
  },
};

export function ActivityStatCard({ label, value, icon: Icon, color, delay = 0 }: StatCardProps) {
  const styles = statColors[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`group card overflow-hidden border border-transparent p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 ${styles.ring}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <motion.p
            className="mt-1 text-3xl font-bold text-gray-900 dark:text-white"
            key={String(value)}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260 }}
          >
            {value}
          </motion.p>
        </div>
        <motion.div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.bg}`}
          animate={{ rotate: [0, 4, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className={styles.icon} size={24} />
        </motion.div>
      </div>
    </motion.div>
  );
}
