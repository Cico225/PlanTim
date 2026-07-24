import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type SectionTheme = 'activity' | 'tasks' | 'chart';

interface DashboardSectionCardProps {
  theme: SectionTheme;
  title: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  delay?: number;
}

const themeGradients: Record<SectionTheme, string> = {
  activity: 'from-primary-50/90 via-indigo-50/50 to-transparent dark:from-primary-900/20 dark:via-indigo-900/10',
  tasks: 'from-amber-50/90 via-orange-50/40 to-transparent dark:from-amber-900/15 dark:via-orange-900/10',
  chart: 'from-emerald-50/90 via-teal-50/40 to-transparent dark:from-emerald-900/15 dark:via-teal-900/10',
};

function SectionMiniAnimation({ theme }: { theme: SectionTheme }) {
  if (theme === 'activity') {
    return (
      <svg viewBox="0 0 80 32" className="h-6 w-[3.2rem] opacity-70" aria-hidden>
        <motion.path
          d="M4 24 L16 18 L28 20 L40 12 L52 14 L64 8 L76 10"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ pathLength: [0.2, 1, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      </svg>
    );
  }
  if (theme === 'tasks') {
    return (
      <svg viewBox="0 0 80 32" className="h-6 w-[3.2rem] opacity-70" aria-hidden>
        {[0, 1].map((i) => (
          <motion.rect
            key={i}
            x={12 + i * 28}
            y={10}
            width="20"
            height="14"
            rx="3"
            fill="#f59e0b"
            opacity={0.5 + i * 0.2}
            animate={{ y: [10, 7, 10] }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 32" className="h-8 w-16 opacity-70" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={i}
          x={8 + i * 16}
          y={24 - (i + 1) * 4}
          width="10"
          height={(i + 1) * 4}
          rx="2"
          fill={i % 2 === 0 ? '#3b82f6' : '#22c55e'}
          animate={{ scaleY: [0.6, 1, 0.6] }}
          transition={{ duration: 2, delay: i * 0.12, repeat: Infinity }}
          style={{ transformOrigin: `${13 + i * 16}px 24px` }}
        />
      ))}
    </svg>
  );
}

export default function DashboardSectionCard({
  theme,
  title,
  action,
  badge,
  children,
  delay = 0,
}: DashboardSectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="card overflow-hidden p-0 transition-shadow hover:shadow-md"
    >
      <div className={`border-b border-gray-100 bg-gradient-to-r px-4 py-3 dark:border-dark-700 ${themeGradients[theme]}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SectionMiniAnimation theme={theme} />
            <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">{title}</h2>
            {badge}
          </div>
          {action}
        </div>
      </div>
      {children}
    </motion.div>
  );
}
