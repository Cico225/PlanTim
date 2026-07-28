import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiClipboard, FiMessageSquare } from 'react-icons/fi';

export default function MaloprodajaOverview() {
  const navigate = useNavigate();

  const panels = [
    {
      id: 'operations' as const,
      title: 'Plan i evidencija obilazaka, kontrola i edukacija',
      description:
        'Ulaz u postojeći operativni dio modula gdje su planovi, evidencije, kontrole i edukacije već najvećim dijelom pripremljeni.',
      action: 'Otvori operativni modul',
      icon: FiClipboard,
      color: 'teal' as const,
      onClick: () => navigate('/maloprodaja'),
    },
    {
      id: 'complaints' as const,
      title: 'Reklamacije',
      description:
        'Novi panel za vođenje reklamacija, praćenje statusa, odgovornosti i rješavanje zahtjeva iz maloprodaje.',
      action: 'Otvori reklamacije',
      icon: FiMessageSquare,
      color: 'amber' as const,
      onClick: () => navigate('/planika/retail/reklamacije'),
    },
  ];

  const colorStyles = {
    teal: {
      bg: 'bg-teal-500/10',
      icon: 'text-teal-600 dark:text-teal-400',
      ring: 'group-hover:ring-teal-200 dark:group-hover:ring-teal-900/50',
      gradient: 'from-teal-500/20 via-cyan-400/10 to-sky-300/10',
    },
    amber: {
      bg: 'bg-amber-500/10',
      icon: 'text-amber-600 dark:text-amber-400',
      ring: 'group-hover:ring-amber-200 dark:group-hover:ring-amber-900/50',
      gradient: 'from-amber-500/20 via-orange-400/10 to-yellow-300/10',
    },
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-teal-50/40 to-amber-50/30 p-6 shadow-sm dark:border-dark-700 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
        <Link
          to="/planika"
          className="inline-block text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 sm:text-sm"
        >
          ← Planika
        </Link>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
              Planika
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Maloprodaja
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
              Odaberite radni tok za operativni nadzor maloprodaje ili ulaz u novi segment reklamacija.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {panels.map((panel, index) => {
          const styles = colorStyles[panel.color];
          const Icon = panel.icon;

          return (
            <motion.button
              key={panel.id}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              onClick={panel.onClick}
              className={`group card relative flex h-full flex-col overflow-hidden border border-transparent p-0 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 ${styles.ring}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-70`} />
              <RetailPanelAnimation
                variant={panel.id}
                className="relative mx-5 mt-5 h-44 rounded-3xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/5 dark:bg-dark-900/40"
              />

              <div className="relative flex flex-1 flex-col p-6 pt-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.bg}`}>
                    <Icon className={styles.icon} size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{panel.title}</h3>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {panel.id === 'operations' ? 'Postojeći operativni dio' : 'Novi segment'}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {panel.description}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-600 transition-transform group-hover:translate-x-1 dark:text-primary-400">
                  {panel.action}
                  <FiArrowRight size={16} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RetailPanelAnimation({
  variant,
  className = '',
}: {
  variant: 'operations' | 'complaints';
  className?: string;
}) {
  if (variant === 'complaints') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect
            x="22"
            y="20"
            width="156"
            height="76"
            rx="22"
            fill="#fffbeb"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M58 34 H142 C149 34 154 39 154 46 V66 C154 73 149 78 142 78 H88 L66 92 V78 H58 C51 78 46 73 46 66 V46 C46 39 51 34 58 34 Z"
            fill="#f59e0b"
            opacity="0.92"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.circle
            cx="70"
            cy="54"
            r="6"
            fill="#fffbeb"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <motion.path
            d="M90 50 H136"
            stroke="#fffbeb"
            strokeWidth="6"
            strokeLinecap="round"
            animate={{ pathLength: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.path
            d="M90 63 H122"
            stroke="#fde68a"
            strokeWidth="6"
            strokeLinecap="round"
            animate={{ pathLength: [0.35, 1, 0.35] }}
            transition={{ duration: 2, delay: 0.25, repeat: Infinity }}
          />
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={54 + i * 46}
              cy="100"
              r="4"
              fill="#fbbf24"
              animate={{ y: [0, -8, 0], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 1.9, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <motion.rect
          x="18"
          y="18"
          width="164"
          height="84"
          rx="24"
          fill="#f0fdfa"
          animate={{ opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Kalendar */}
        <rect x="28" y="28" width="72" height="58" rx="12" fill="white" />
        <rect x="28" y="28" width="72" height="14" rx="12" fill="#14b8a6" />
        <rect x="28" y="36" width="72" height="6" fill="#14b8a6" />
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const x = 36 + col * 20;
          const y = 50 + row * 16;
          const isActive = i === 2 || i === 4;

          return (
            <motion.rect
              key={i}
              x={x}
              y={y}
              width="12"
              height="10"
              rx="3"
              fill={isActive ? '#ccfbf1' : '#f8fafc'}
              stroke={isActive ? '#14b8a6' : '#e2e8f0'}
              strokeWidth="1"
              animate={isActive ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 2, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
            />
          );
        })}

        {/* Evidencija / checklist */}
        <motion.g
          animate={{ x: [0, 2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="112" y="30" width="58" height="56" rx="10" fill="white" />
          <rect x="120" y="38" width="42" height="5" rx="2.5" fill="#99f6e4" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="120" y={50 + i * 14} width="10" height="10" rx="3" fill="#ecfeff" stroke="#5eead4" strokeWidth="1" />
              <motion.path
                d={`M122.5 ${54 + i * 14} L124.5 ${56 + i * 14} L127.5 ${51 + i * 14}`}
                fill="none"
                stroke="#0d9488"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0.4 }}
                animate={{ pathLength: [0, 1, 1], opacity: [0.4, 1, 1] }}
                transition={{ duration: 1.4, delay: 0.4 + i * 0.35, repeat: Infinity, repeatDelay: 1.8 }}
              />
              <rect x="134" y={52 + i * 14} width={28 - i * 4} height="5" rx="2.5" fill={i === 0 ? '#14b8a6' : '#5eead4'} opacity={0.85 - i * 0.15} />
            </g>
          ))}
        </motion.g>

        {/* Ruta obilazaka */}
        <motion.path
          d="M34 96 Q72 78 108 88 T170 94"
          fill="none"
          stroke="#06b6d4"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          animate={{ strokeDashoffset: [0, -22] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
        {[
          { cx: 34, cy: 96 },
          { cx: 82, cy: 84 },
          { cx: 130, cy: 90 },
        ].map((pin, i) => (
          <motion.g
            key={i}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.2, delay: i * 0.35, repeat: Infinity, ease: 'easeInOut' }}
          >
            <circle cx={pin.cx} cy={pin.cy} r="5" fill="#0ea5e9" opacity="0.25" />
            <motion.circle
              cx={pin.cx}
              cy={pin.cy}
              r="4"
              fill="#0ea5e9"
              animate={{ scale: [1, 1.15, 1], opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 2, delay: i * 0.25, repeat: Infinity }}
            />
            <circle cx={pin.cx} cy={pin.cy - 7} r="3" fill="#14b8a6" />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
