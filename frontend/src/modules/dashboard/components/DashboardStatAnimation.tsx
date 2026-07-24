import type { ComponentType } from 'react';
import { motion } from 'framer-motion';

export type DashboardStatId =
  | 'tasks'
  | 'projects'
  | 'pending'
  | 'notifications'
  | 'users'
  | 'upcoming'
  | 'weekly'
  | 'recentNotifications';

interface DashboardStatAnimationProps {
  statId: DashboardStatId;
  color: string;
  className?: string;
}

const colorMap: Record<string, { primary: string; secondary: string; glow: string }> = {
  blue: { primary: '#2563eb', secondary: '#60a5fa', glow: 'rgba(37, 99, 235, 0.22)' },
  green: { primary: '#16a34a', secondary: '#4ade80', glow: 'rgba(22, 163, 74, 0.22)' },
  yellow: { primary: '#ca8a04', secondary: '#facc15', glow: 'rgba(202, 138, 4, 0.22)' },
  red: { primary: '#dc2626', secondary: '#f87171', glow: 'rgba(220, 38, 38, 0.22)' },
  purple: { primary: '#9333ea', secondary: '#c084fc', glow: 'rgba(147, 51, 234, 0.22)' },
  teal: { primary: '#0d9488', secondary: '#2dd4bf', glow: 'rgba(13, 148, 136, 0.22)' },
  orange: { primary: '#ea580c', secondary: '#fb923c', glow: 'rgba(234, 88, 12, 0.22)' },
};

function TasksAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.g key={i} animate={{ x: [0, 3, 0] }} transition={{ duration: 2.2, delay: i * 0.18, repeat: Infinity }}>
          <rect x={22} y={16 + i * 18} width="16" height="16" rx="4" fill={colors.primary} opacity={0.2} />
          <motion.path
            d={`M27 ${23 + i * 18} L31 ${27 + i * 18} L41 ${19 + i * 18}`}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ pathLength: [0, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, delay: i * 0.3, repeat: Infinity }}
          />
          <motion.rect
            x={50}
            y={19 + i * 18}
            width={58 - i * 8}
            height="8"
            rx="4"
            fill={colors.secondary}
            opacity={0.5}
            animate={{ width: [40, 58 - i * 8, 40] }}
            transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
          />
        </motion.g>
      ))}
    </svg>
  );
}

function ProjectsAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={38 + i * 10}
          y={30 - i * 7}
          width="58"
          height="34"
          rx="6"
          fill={colors.primary}
          opacity={0.3 + i * 0.22}
          animate={{ y: [30 - i * 7, 24 - i * 7, 30 - i * 7] }}
          transition={{ duration: 2.8, delay: i * 0.12, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <motion.path
        d="M50 30 L80 16 L110 30"
        fill="none"
        stroke={colors.secondary}
        strokeWidth="3"
        strokeLinecap="round"
        animate={{ pathLength: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.circle
        cx="124"
        cy="22"
        r="5"
        fill={colors.secondary}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </svg>
  );
}

function PendingAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.circle
        cx="78"
        cy="40"
        r="24"
        fill="none"
        stroke={colors.secondary}
        strokeWidth="2"
        strokeDasharray="6 4"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '78px 40px' }}
      />
      <motion.line
        x1="78"
        y1="40"
        x2="78"
        y2="24"
        stroke={colors.primary}
        strokeWidth="3"
        strokeLinecap="round"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '78px 40px' }}
      />
      <motion.line
        x1="78"
        y1="40"
        x2="94"
        y2="40"
        stroke={colors.secondary}
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '78px 40px' }}
      />
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={112 + i * 12}
          y={48 - i * 5}
          width="8"
          height="8"
          rx="2"
          fill={colors.primary}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.4, delay: i * 0.25, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

function NotificationsAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.path
        d="M70 22 C70 16 74 12 82 12 C90 12 94 16 94 22 L94 32 C100 34 108 40 108 48 L108 52 L56 52 L56 48 C56 40 62 34 70 32 Z"
        fill={colors.primary}
        animate={{ rotate: [-10, 10, -10] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '82px 32px' }}
      />
      <motion.circle
        cx="96"
        cy="18"
        r="7"
        fill={colors.secondary}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="82"
          cy="32"
          r={14 + i * 9}
          fill="none"
          stroke={colors.secondary}
          strokeWidth="1.5"
          animate={{ scale: [0.7, 1.35], opacity: [0.45, 0] }}
          transition={{ duration: 1.8, delay: i * 0.35, repeat: Infinity }}
          style={{ transformOrigin: '82px 32px' }}
        />
      ))}
    </svg>
  );
}

function UsersAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  const people = [
    { cx: 54, delay: 0, scale: 0.9 },
    { cx: 80, delay: 0.15, scale: 1.1 },
    { cx: 106, delay: 0.3, scale: 0.95 },
  ];
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.path
        d="M54 38 Q80 28 106 38"
        fill="none"
        stroke={colors.secondary}
        strokeWidth="2"
        strokeDasharray="5 3"
        animate={{ strokeDashoffset: [0, -16] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      {people.map((p, i) => (
        <motion.g
          key={i}
          animate={{ y: [0, -5, 0], scale: [p.scale, p.scale * 1.05, p.scale] }}
          transition={{ duration: 2.2, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${p.cx}px 40px` }}
        >
          <circle cx={p.cx} cy="30" r="11" fill={colors.primary} opacity={0.85 - i * 0.1} />
          <path d={`M${p.cx - 15} 58 Q${p.cx} 42 ${p.cx + 15} 58`} fill={colors.primary} opacity={0.75} />
        </motion.g>
      ))}
    </svg>
  );
}

function UpcomingAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.rect
        x="48"
        y="18"
        width="64"
        height="48"
        rx="8"
        fill={colors.primary}
        opacity={0.15}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.rect x="48" y="18" width="64" height="14" rx="8" fill={colors.primary} opacity={0.85} />
      {[0, 1, 2].map((i) => (
        <motion.g key={i} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}>
          <rect x={56} y={38 + i * 10} width="10" height="10" rx="2" fill={colors.secondary} opacity={0.35} />
          <motion.rect
            x="72"
            y={41 + i * 10}
            width="28"
            height="3"
            rx="1.5"
            fill={colors.primary}
            opacity={0.7}
            animate={{ scaleX: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, delay: i * 0.25, repeat: Infinity }}
            style={{ transformOrigin: `${86}px ${42.5 + i * 10}px` }}
          />
        </motion.g>
      ))}
      <motion.circle
        cx="118"
        cy="24"
        r="6"
        fill={colors.secondary}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
  );
}

function WeeklyAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  const bars = [0.35, 0.55, 0.45, 0.8, 0.6, 0.95, 0.7];
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.path
        d="M16 58 L40 46 L64 50 L88 32 L112 38 L136 22"
        fill="none"
        stroke={colors.secondary}
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{ pathLength: [0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={18 + i * 18}
          y={58 - h * 38}
          width="10"
          height={h * 38}
          rx="2"
          fill={i % 2 === 0 ? colors.primary : colors.secondary}
          opacity={0.85}
          animate={{ scaleY: [0.4, 1, 0.55, 1] }}
          transition={{
            duration: 2.2,
            delay: i * 0.1,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: `${23 + i * 18}px 58px` }}
        />
      ))}
    </svg>
  );
}

function RecentNotificationsAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          animate={{ x: [0, 4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, delay: i * 0.25, repeat: Infinity }}
        >
          <rect
            x={36 + i * 6}
            y={22 + i * 8}
            width="52"
            height="28"
            rx="6"
            fill={colors.primary}
            opacity={0.2 + i * 0.15}
          />
          <rect x={42 + i * 6} y={28 + i * 8} width="28" height="4" rx="2" fill={colors.secondary} opacity={0.7} />
          <rect x={42 + i * 6} y={36 + i * 8} width="36" height="4" rx="2" fill={colors.primary} opacity={0.45} />
        </motion.g>
      ))}
      <motion.circle
        cx="108"
        cy="26"
        r="8"
        fill={colors.secondary}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
      <motion.path
        d="M104 26 L107 29 L114 22"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        animate={{ pathLength: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  );
}

const animations: Record<DashboardStatId, ComponentType<{ colors: (typeof colorMap)[string] }>> = {
  tasks: TasksAnimation,
  projects: ProjectsAnimation,
  pending: PendingAnimation,
  notifications: NotificationsAnimation,
  users: UsersAnimation,
  upcoming: UpcomingAnimation,
  weekly: WeeklyAnimation,
  recentNotifications: RecentNotificationsAnimation,
};

export default function DashboardStatAnimation({ statId, color, className = '' }: DashboardStatAnimationProps) {
  const colors = colorMap[color] ?? colorMap.blue;
  const Animation = animations[statId];

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ background: `linear-gradient(135deg, ${colors.glow}, transparent 70%)` }}
    >
      <motion.div
        className="absolute inset-0 opacity-30 dark:opacity-20"
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div
          className="absolute -right-3 -top-3 h-16 w-16 rounded-full blur-2xl"
          style={{ backgroundColor: colors.secondary }}
        />
      </motion.div>
      <div className="relative flex h-[4.8rem] items-center justify-center px-3 py-2 sm:h-[5.6rem]">
        <Animation colors={colors} />
      </div>
    </div>
  );
}
