import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import type { PlanikaSubmoduleId } from '../constants';

interface PlanikaSubmoduleAnimationProps {
  submoduleId: PlanikaSubmoduleId;
  color: string;
  className?: string;
}

const colorMap: Record<string, { primary: string; secondary: string; glow: string }> = {
  orange: { primary: '#ea580c', secondary: '#fb923c', glow: 'rgba(234, 88, 12, 0.25)' },
  teal: { primary: '#0d9488', secondary: '#2dd4bf', glow: 'rgba(13, 148, 136, 0.25)' },
  pink: { primary: '#db2777', secondary: '#f472b6', glow: 'rgba(219, 39, 119, 0.25)' },
  purple: { primary: '#9333ea', secondary: '#c084fc', glow: 'rgba(147, 51, 234, 0.25)' },
  green: { primary: '#16a34a', secondary: '#4ade80', glow: 'rgba(22, 163, 74, 0.25)' },
  yellow: { primary: '#ca8a04', secondary: '#facc15', glow: 'rgba(202, 138, 4, 0.25)' },
};

function SalesAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  const bars = [0.45, 0.65, 0.5, 0.85, 0.7, 1];
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.path
        d="M12 58 L38 42 L58 48 L78 28 L98 34 L118 18 L148 24"
        fill="none"
        stroke={colors.secondary}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      {bars.map((h, i) => (
        <motion.rect
          key={i}
          x={14 + i * 22}
          y={58 - h * 40}
          width="12"
          height={h * 40}
          rx="3"
          fill={colors.primary}
          opacity={0.85}
          initial={{ scaleY: 0, originY: 1 }}
          animate={{ scaleY: [0.3, 1, 0.5, 1] }}
          transition={{
            duration: 2.4,
            delay: i * 0.12,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          style={{ transformOrigin: `${20 + i * 22}px 58px` }}
        />
      ))}
      <motion.circle
        cx="148"
        cy="24"
        r="5"
        fill={colors.secondary}
        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </svg>
  );
}

function FinanceAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.g
          key={i}
          animate={{ y: [0, -4, 0], rotate: [0, i % 2 ? 6 : -6, 0] }}
          transition={{ duration: 2.2, delay: i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx={56 + i * 24} cy={52 - i * 6} rx="18" ry="6" fill={colors.primary} opacity={0.35} />
          <circle cx={56 + i * 24} cy={44 - i * 6} r="16" fill={colors.primary} opacity={0.9 - i * 0.15} />
          <text
            x={56 + i * 24}
            y={49 - i * 6}
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="700"
          >
            €
          </text>
        </motion.g>
      ))}
      <motion.path
        d="M20 68 Q80 58 140 68"
        fill="none"
        stroke={colors.secondary}
        strokeWidth="2"
        strokeDasharray="6 4"
        animate={{ strokeDashoffset: [0, -20] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}

function RetailAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.path
        d="M48 28 L52 18 L108 18 L112 28 Z M44 28 H116 V58 C116 62 112 66 108 66 H52 C48 66 44 62 44 58 Z"
        fill={colors.primary}
        opacity={0.9}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.rect
        x="68"
        y="8"
        width="24"
        height="14"
        rx="4"
        fill={colors.secondary}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {[
        { x: 58, delay: 0 },
        { x: 80, delay: 0.3 },
        { x: 102, delay: 0.6 },
      ].map((item, i) => (
        <motion.circle
          key={i}
          cx={item.x}
          cy={40}
          r="6"
          fill={colors.secondary}
          animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, delay: item.delay, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

function MarketingAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.path
        d="M36 40 L36 28 L52 36 L68 24 L68 56 L52 48 L36 56 Z"
        fill={colors.primary}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ transformOrigin: '52px 40px' }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.path
          key={i}
          d={`M78 ${40 - i * 6} Q${95 + i * 8} ${40 - i * 4} ${110 + i * 12} ${40 + i * 2}`}
          fill="none"
          stroke={colors.secondary}
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{ pathLength: [0.2, 1, 0.2], opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
    </svg>
  );
}

function HrAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  const people = [
    { cx: 52, delay: 0 },
    { cx: 80, delay: 0.2 },
    { cx: 108, delay: 0.4 },
  ];
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.line
        x1="52"
        y1="38"
        x2="108"
        y2="38"
        stroke={colors.secondary}
        strokeWidth="2"
        strokeDasharray="4 4"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {people.map((p, i) => (
        <motion.g
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <circle cx={p.cx} cy="32" r="10" fill={colors.primary} />
          <path
            d={`M${p.cx - 14} 58 Q${p.cx} 44 ${p.cx + 14} 58`}
            fill={colors.primary}
            opacity={0.85}
          />
        </motion.g>
      ))}
    </svg>
  );
}

function ClubAnimation({ colors }: { colors: (typeof colorMap)[string] }) {
  const sparks = [
    { x: 40, y: 22, delay: 0 },
    { x: 120, y: 18, delay: 0.4 },
    { x: 128, y: 48, delay: 0.8 },
    { x: 32, y: 52, delay: 1.2 },
  ];
  return (
    <svg viewBox="0 0 160 80" className="h-full w-full" aria-hidden>
      <motion.polygon
        points="80,16 86,34 106,34 90,46 96,64 80,52 64,64 70,46 54,34 74,34"
        fill={colors.primary}
        animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '80px 40px' }}
      />
      {sparks.map((s, i) => (
        <motion.circle
          key={i}
          cx={s.x}
          cy={s.y}
          r="3"
          fill={colors.secondary}
          animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, delay: s.delay, repeat: Infinity }}
        />
      ))}
      <motion.rect
        x="58"
        y="58"
        width="44"
        height="10"
        rx="3"
        fill={colors.secondary}
        opacity={0.5}
        animate={{ opacity: [0.3, 0.7, 0.3], scaleX: [0.9, 1, 0.9] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        style={{ transformOrigin: '80px 63px' }}
      />
    </svg>
  );
}

const animations: Record<
  PlanikaSubmoduleId,
  ComponentType<{ colors: (typeof colorMap)[string] }>
> = {
  sales: SalesAnimation,
  finance: FinanceAnimation,
  retail: RetailAnimation,
  marketing: MarketingAnimation,
  hr: HrAnimation,
  club: ClubAnimation,
};

export default function PlanikaSubmoduleAnimation({
  submoduleId,
  color,
  className = '',
}: PlanikaSubmoduleAnimationProps) {
  const colors = colorMap[color] ?? colorMap.orange;
  const Animation = animations[submoduleId];

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ background: `linear-gradient(135deg, ${colors.glow}, transparent 70%)` }}
    >
      <div className="absolute inset-0 opacity-30 dark:opacity-20">
        <motion.div
          className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
          style={{ backgroundColor: colors.secondary }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
      <div className="relative flex h-28 items-center justify-center px-4 py-3 sm:h-32">
        <Animation colors={colors} />
      </div>
    </div>
  );
}
