import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiFileText, FiShield } from 'react-icons/fi';

export default function FinanceLandingPage() {
  const navigate = useNavigate();

  const panels = [
    {
      id: 'zabrane' as const,
      title: 'Krediti — Upravljanje administrativnim zabranama',
      description:
        'Kompletan modul kredita: pregled ugovora, uvoz Excel podataka, skeniranje, uparivanje administrativnih zabrana i izvještaji.',
      action: 'Otvori upravljanje zabranama',
      subtitle: 'Kompletan modul',
      icon: FiShield,
      color: 'teal' as const,
      onClick: () => navigate('/planika/finance/krediti'),
    },
    {
      id: 'ugovori' as const,
      title: 'Krediti — Spiskovi aktivnih ugovora',
      description:
        'Evidencija firmi sa potpisanim ugovorom: ručni unos ili uvoz Excel-a, spiskovi uposlenika (slika/PDF) i pretraga po svim poljima.',
      action: 'Otvori spiskove ugovora',
      subtitle: 'Pregled i evidencija',
      icon: FiFileText,
      color: 'sky' as const,
      onClick: () => navigate('/planika/finance/ugovori'),
    },
  ];

  const colorStyles = {
    teal: {
      bg: 'bg-teal-500/10',
      icon: 'text-teal-600 dark:text-teal-400',
      ring: 'group-hover:ring-teal-200 dark:group-hover:ring-teal-900/50',
      gradient: 'from-teal-500/20 via-cyan-400/10 to-emerald-300/10',
    },
    sky: {
      bg: 'bg-sky-500/10',
      icon: 'text-sky-600 dark:text-sky-400',
      ring: 'group-hover:ring-sky-200 dark:group-hover:ring-sky-900/50',
      gradient: 'from-sky-500/20 via-blue-400/10 to-indigo-300/10',
    },
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-teal-50/40 to-sky-50/30 p-6 shadow-sm dark:border-dark-700 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
        <Link
          to="/planika"
          className="inline-block text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 sm:text-sm"
        >
          ← Planika
        </Link>
        <div className="mt-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Planika
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Finansije i računovodstvo
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
            Odaberite radni tok: upravljanje administrativnim zabranama ili pregled spiskova aktivnih ugovora.
          </p>
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
              <FinancePanelAnimation
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

function FinancePanelAnimation({
  variant,
  className = '',
}: {
  variant: 'zabrane' | 'ugovori';
  className?: string;
}) {
  if (variant === 'ugovori') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect
            x="18"
            y="18"
            width="164"
            height="84"
            rx="22"
            fill="#f0f9ff"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <rect x="30" y="28" width="140" height="18" rx="8" fill="white" />
          <rect x="38" y="34" width="52" height="6" rx="3" fill="#38bdf8" />
          <rect x="120" y="34" width="36" height="6" rx="3" fill="#bae6fd" />
          {[0, 1, 2].map((i) => (
            <motion.g
              key={i}
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 2.2, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect x="30" y={54 + i * 16} width="140" height="12" rx="6" fill="white" />
              <circle cx="42" cy={60 + i * 16} r="3.5" fill={i === 0 ? '#0ea5e9' : '#7dd3fc'} />
              <rect x="52" y={57 + i * 16} width={70 - i * 10} height="5" rx="2.5" fill="#38bdf8" opacity={0.9 - i * 0.15} />
              <rect x="140" y={57 + i * 16} width="20" height="5" rx="2.5" fill="#e0f2fe" />
            </motion.g>
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
          fill="#f0fdfa"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.rect
          x="36"
          y="32"
          width="72"
          height="56"
          rx="12"
          fill="white"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <rect x="44" y="40" width="56" height="6" rx="3" fill="#14b8a6" />
        <rect x="44" y="52" width="40" height="5" rx="2.5" fill="#99f6e4" />
        <rect x="44" y="62" width="48" height="5" rx="2.5" fill="#5eead4" />
        <motion.circle
          cx="88"
          cy="76"
          r="8"
          fill="#0d9488"
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <motion.path
          d="M84 76 L87 79 L93 72"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0.2 }}
          animate={{ pathLength: [0.2, 1, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />

        <motion.g
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <rect x="120" y="36" width="48" height="48" rx="12" fill="white" />
          <rect x="128" y="44" width="32" height="5" rx="2.5" fill="#14b8a6" />
          <rect x="128" y="54" width="24" height="4" rx="2" fill="#99f6e4" />
          <rect x="128" y="62" width="28" height="4" rx="2" fill="#5eead4" />
          <motion.rect
            x="128"
            y="72"
            width="20"
            height="6"
            rx="3"
            fill="#0f766e"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </motion.g>

        <motion.path
          d="M34 100 Q100 78 168 98"
          fill="none"
          stroke="#14b8a6"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          animate={{ strokeDashoffset: [0, -22] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
      </svg>
    </div>
  );
}
