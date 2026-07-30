import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiBookOpen, FiBriefcase, FiShoppingBag } from 'react-icons/fi';
import { LMS_DIREKCIJA_BASE, LMS_RETAIL_BASE } from '../lmsPaths';

export default function LMSLandingPage() {
  const navigate = useNavigate();

  const panels = [
    {
      id: 'direkcija' as const,
      title: 'Sistem za učenje — Direkcija',
      subtitle: 'Menadžment i administracija',
      description:
        'Obuke i materijali namijenjeni direkciji i menadžmentu: politike, procedure, liderstvo i korporativni programi.',
      action: 'Otvori direkciju',
      icon: FiBriefcase,
      color: 'indigo' as const,
      onClick: () => navigate(LMS_DIREKCIJA_BASE),
    },
    {
      id: 'maloprodaja' as const,
      title: 'Sistem za učenje — Maloprodaja',
      subtitle: 'Kursevi, kvizovi i certifikati',
      description:
        'Kompletan LMS za maloprodaju: put učenja, kursevi, kvizovi, bedževi, certifikati i admin izvještaji.',
      action: 'Otvori maloprodaju',
      icon: FiShoppingBag,
      color: 'emerald' as const,
      onClick: () => navigate(LMS_RETAIL_BASE),
    },
  ];

  const colorStyles = {
    indigo: {
      bg: 'bg-indigo-500/10',
      icon: 'text-indigo-600 dark:text-indigo-400',
      ring: 'group-hover:ring-indigo-200 dark:group-hover:ring-indigo-900/50',
      gradient: 'from-indigo-500/20 via-violet-400/10 to-purple-300/10',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-600 dark:text-emerald-400',
      ring: 'group-hover:ring-emerald-200 dark:group-hover:ring-emerald-900/50',
      gradient: 'from-emerald-500/20 via-teal-400/10 to-cyan-300/10',
    },
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-emerald-50/40 to-indigo-50/30 p-6 shadow-sm dark:border-dark-700 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
        <div className="mt-1 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <FiBookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              PlanTim
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
              Sistem za učenje
            </h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
          Odaberite modul: Direkcija ili Maloprodaja. Postojeći kursevi i sadržaj nalaze se u panelu
          Maloprodaja.
        </p>
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
              <LMSPanelAnimation
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
                      {panel.subtitle}
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

function LMSPanelAnimation({
  variant,
  className = '',
}: {
  variant: 'direkcija' | 'maloprodaja';
  className?: string;
}) {
  if (variant === 'direkcija') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect
            x="18"
            y="18"
            width="164"
            height="84"
            rx="22"
            fill="#eef2ff"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <rect x="36" y="32" width="80" height="56" rx="12" fill="white" />
          <motion.rect
            x="48"
            y="44"
            width="56"
            height="8"
            rx="4"
            fill="#818cf8"
            animate={{ width: [40, 56, 40] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <rect x="48" y="60" width="44" height="6" rx="3" fill="#c7d2fe" />
          <rect x="48" y="72" width="36" height="6" rx="3" fill="#e0e7ff" />
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={136 + i * 14}
              cy={58}
              r="8"
              fill={i === 0 ? '#6366f1' : '#a5b4fc'}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.8, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
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
          rx="22"
          fill="#ecfdf5"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {[0, 1, 2].map((i) => (
          <motion.g
            key={i}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.2, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x={32 + i * 52} y="36" width="44" height="52" rx="10" fill="white" />
            <rect x={40 + i * 52} y="46" width="28" height="5" rx="2.5" fill="#34d399" />
            <rect x={40 + i * 52} y="56" width="22" height="4" rx="2" fill="#a7f3d0" />
            <circle cx={54 + i * 52} cy="74" r="6" fill="#10b981" opacity={0.9 - i * 0.15} />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
