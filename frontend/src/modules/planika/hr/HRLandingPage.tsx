import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowRight,
  FiUsers,
  FiHome,
  FiBriefcase,
  FiUserPlus,
  FiFileText,
  FiClipboard,
  FiClock,
  FiCalendar,
  FiBookOpen,
  FiStar,
  FiAward,
  FiUserMinus,
  FiBarChart2,
  FiGrid,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

export type HRSectionKey =
  | 'dashboard'
  | 'employees'
  | 'departments'
  | 'ats'
  | 'onboarding'
  | 'contracts'
  | 'decisions'
  | 'attendance'
  | 'leaves'
  | 'education'
  | 'talent'
  | 'evaluations'
  | 'offboarding'
  | 'reports';

type PanelColor =
  | 'emerald'
  | 'teal'
  | 'sky'
  | 'cyan'
  | 'amber'
  | 'rose'
  | 'slate'
  | 'blue'
  | 'green'
  | 'orange'
  | 'lime'
  | 'indigo'
  | 'red'
  | 'stone';

interface HRPanel {
  id: HRSectionKey;
  title: string;
  subtitle: string;
  description: string;
  action: string;
  icon: IconType;
  color: PanelColor;
}

export const HR_PANELS: HRPanel[] = [
  {
    id: 'dashboard',
    title: 'Pregled',
    subtitle: 'Dashboard',
    description: 'Statistike, alarmi i brzi uvid u stanje ljudskih resursa.',
    action: 'Otvori pregled',
    icon: FiBarChart2,
    color: 'emerald',
  },
  {
    id: 'ats',
    title: 'ATS',
    subtitle: 'Zapošljavanje',
    description: 'Pozicije, kandidati, intervjui i ponude kroz cijeli proces selekcije.',
    action: 'Otvori ATS',
    icon: FiBriefcase,
    color: 'cyan',
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    subtitle: 'Prijem',
    description: 'Vođenje prijema novih zaposlenika i checkliste uključivanja.',
    action: 'Otvori onboarding',
    icon: FiUserPlus,
    color: 'amber',
  },
  {
    id: 'contracts',
    title: 'Ugovori',
    subtitle: 'Dokumentacija',
    description: 'Ugovori o radu, aneksi i praćenje važenja ugovorne dokumentacije.',
    action: 'Otvori ugovore',
    icon: FiFileText,
    color: 'rose',
  },
  {
    id: 'employees',
    title: 'Zaposleni',
    subtitle: 'Kartoteka',
    description: 'Upravljanje zaposlenicima, profilima, statusima i osnovnim podacima.',
    action: 'Otvori zaposlene',
    icon: FiUsers,
    color: 'teal',
  },
  {
    id: 'departments',
    title: 'Odjeli',
    subtitle: 'Organizacija',
    description: 'Organizacijska struktura, odjeli i hijerarhija odgovornosti.',
    action: 'Otvori odjele',
    icon: FiHome,
    color: 'sky',
  },
  {
    id: 'attendance',
    title: 'Evidencije rada',
    subtitle: 'Radno vrijeme',
    description: 'Praćenje radnog vremena, prisutnosti i evidencija sati.',
    action: 'Otvori evidencije',
    icon: FiClock,
    color: 'blue',
  },
  {
    id: 'leaves',
    title: 'Odsustva',
    subtitle: 'Godišnji i bolovanja',
    description: 'Zahtjevi, odobravanja i pregled godišnjih odmora i bolovanja.',
    action: 'Otvori odsustva',
    icon: FiCalendar,
    color: 'green',
  },
  {
    id: 'evaluations',
    title: 'Evaluacije',
    subtitle: 'Performanse',
    description: 'Ocjene, GO/NO-GO procesi i praćenje performansi zaposlenika.',
    action: 'Otvori evaluacije',
    icon: FiAward,
    color: 'indigo',
  },
  {
    id: 'education',
    title: 'Edukacije',
    subtitle: 'Razvoj',
    description: 'Obuke, trening programi i praćenje edukacija zaposlenika.',
    action: 'Otvori edukacije',
    icon: FiBookOpen,
    color: 'orange',
  },
  {
    id: 'talent',
    title: 'Talent Management',
    subtitle: 'Talenti',
    description: 'Identifikacija talenata, karijerne putanje i nasljeđivanje pozicija.',
    action: 'Otvori talente',
    icon: FiStar,
    color: 'lime',
  },
  {
    id: 'decisions',
    title: 'Rješenja i odluke',
    subtitle: 'Formalni akti',
    description: 'Evidencija rješenja, odluka i službenih akata u HR procesu.',
    action: 'Otvori rješenja',
    icon: FiClipboard,
    color: 'slate',
  },
  {
    id: 'offboarding',
    title: 'Offboarding',
    subtitle: 'Odlazak',
    description: 'Procesi odlaska, checkliste i formalno zatvaranje radnog odnosa.',
    action: 'Otvori offboarding',
    icon: FiUserMinus,
    color: 'red',
  },
  {
    id: 'reports',
    title: 'Izvještaji',
    subtitle: 'Analitika',
    description: 'Headcount, fluktuacija, odsustva i ostali HR izvještaji.',
    action: 'Otvori izvještaje',
    icon: FiGrid,
    color: 'stone',
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
  cyan: {
    bg: 'bg-cyan-500/10',
    icon: 'text-cyan-600 dark:text-cyan-400',
    ring: 'group-hover:ring-cyan-200 dark:group-hover:ring-cyan-900/50',
    gradient: 'from-cyan-500/20 via-sky-400/10 to-teal-300/10',
    art: '#06b6d4',
  },
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    ring: 'group-hover:ring-amber-200 dark:group-hover:ring-amber-900/50',
    gradient: 'from-amber-500/20 via-orange-400/10 to-yellow-300/10',
    art: '#f59e0b',
  },
  rose: {
    bg: 'bg-rose-500/10',
    icon: 'text-rose-600 dark:text-rose-400',
    ring: 'group-hover:ring-rose-200 dark:group-hover:ring-rose-900/50',
    gradient: 'from-rose-500/20 via-pink-400/10 to-orange-300/10',
    art: '#f43f5e',
  },
  slate: {
    bg: 'bg-slate-500/10',
    icon: 'text-slate-600 dark:text-slate-300',
    ring: 'group-hover:ring-slate-200 dark:group-hover:ring-slate-700/50',
    gradient: 'from-slate-500/20 via-gray-400/10 to-stone-300/10',
    art: '#64748b',
  },
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
    ring: 'group-hover:ring-blue-200 dark:group-hover:ring-blue-900/50',
    gradient: 'from-blue-500/20 via-sky-400/10 to-indigo-300/10',
    art: '#3b82f6',
  },
  green: {
    bg: 'bg-green-500/10',
    icon: 'text-green-600 dark:text-green-400',
    ring: 'group-hover:ring-green-200 dark:group-hover:ring-green-900/50',
    gradient: 'from-green-500/20 via-emerald-400/10 to-lime-300/10',
    art: '#22c55e',
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
    gradient: 'from-indigo-500/20 via-blue-400/10 to-sky-300/10',
    art: '#6366f1',
  },
  red: {
    bg: 'bg-red-500/10',
    icon: 'text-red-600 dark:text-red-400',
    ring: 'group-hover:ring-red-200 dark:group-hover:ring-red-900/50',
    gradient: 'from-red-500/20 via-rose-400/10 to-orange-300/10',
    art: '#ef4444',
  },
  stone: {
    bg: 'bg-stone-500/10',
    icon: 'text-stone-600 dark:text-stone-300',
    ring: 'group-hover:ring-stone-200 dark:group-hover:ring-stone-700/50',
    gradient: 'from-stone-500/20 via-neutral-400/10 to-zinc-300/10',
    art: '#78716c',
  },
};

export function getHRPanel(section: string | undefined): HRPanel | undefined {
  return HR_PANELS.find((panel) => panel.id === section);
}

export default function HRLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/35 p-6 shadow-sm dark:border-dark-700 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
        <Link
          to="/planika"
          className="inline-block text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 sm:text-sm"
        >
          ← Planika
        </Link>
        <div className="mt-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            Planika
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Ljudski resursi
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
            Odaberite HR modul. Svaki panel vodi u zaseban radni tok — od zaposlenih i ATS-a do odsustava,
            evaluacija i izvještaja.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/60 bg-white/55 px-1.5 py-2 backdrop-blur-sm dark:border-white/5 dark:bg-dark-900/20">
          <div className="relative">
            <div
              className="pointer-events-none absolute left-[3.5%] right-[3.5%] top-1/2 z-0 h-px -translate-y-1/2 bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-200 dark:from-emerald-800 dark:via-teal-700 dark:to-emerald-900"
              aria-hidden
            />
            <div className="relative z-10 flex w-full flex-nowrap items-stretch">
              {HR_PANELS.map((panel, index) => {
                const textBelow = index % 2 === 0;
                const labelClass =
                  'line-clamp-2 max-w-full px-px text-center text-[7px] font-medium leading-[8px] text-gray-600 transition group-hover:text-emerald-700 dark:text-gray-300 dark:group-hover:text-emerald-300 sm:text-[8px] sm:leading-[9px]';

                return (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => navigate(`/planika/hr/${panel.id}`)}
                    className="group flex min-w-0 flex-1 flex-col items-center"
                  >
                    <div className="flex min-h-[1.1rem] flex-1 items-end justify-center sm:min-h-[1.35rem]">
                      {!textBelow && <p className={labelClass}>{panel.title}</p>}
                    </div>

                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white/95 text-[10px] font-semibold text-emerald-700 shadow-[0_3px_10px_rgba(16,185,129,0.12)] transition group-hover:scale-110 group-hover:border-emerald-400 group-hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-dark-800/90 dark:text-emerald-300 dark:group-hover:border-emerald-700 dark:group-hover:bg-emerald-900/20 sm:h-7 sm:w-7 sm:text-[11px]">
                      {index + 1}
                    </div>

                    <div className="flex min-h-[1.1rem] flex-1 items-start justify-center sm:min-h-[1.35rem]">
                      {textBelow && <p className={labelClass}>{panel.title}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {HR_PANELS.map((panel, index) => {
          const styles = colorStyles[panel.color];
          const Icon = panel.icon;

          return (
            <motion.button
              key={panel.id}
              type="button"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.45) }}
              onClick={() => navigate(`/planika/hr/${panel.id}`)}
              className={`group card relative flex h-full flex-col overflow-hidden border border-transparent p-0 text-left transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 ${styles.ring}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-80`} />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)]" />
              <HRPanelAnimation
                section={panel.id}
                color={styles.art}
                className="relative mx-3 mt-3 h-20 rounded-2xl border border-white/40 bg-white/70 p-2 shadow-sm backdrop-blur dark:border-white/5 dark:bg-dark-900/40"
              />

              <div className="relative flex flex-1 flex-col p-3.5 pt-2.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ring-1 ring-white/40 ${styles.bg}`}>
                    <Icon className={styles.icon} size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">
                      {panel.title}
                    </h3>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {panel.subtitle}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
                  {panel.description}
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary-600 transition-transform group-hover:translate-x-1 dark:text-primary-400">
                  {panel.action}
                  <FiArrowRight size={14} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function HRPanelAnimation({
  section,
  color,
  className = '',
}: {
  section: HRSectionKey;
  color: string;
  className?: string;
}) {
  const soft = `${color}22`;

  if (section === 'employees' || section === 'dashboard') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect
            x="16"
            y="16"
            width="168"
            height="88"
            rx="20"
            fill={soft}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          />
          {[0, 1, 2].map((i) => (
            <motion.g
              key={i}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2 + i * 0.2, delay: i * 0.15, repeat: Infinity }}
            >
              <circle cx={48 + i * 52} cy="48" r="14" fill="white" />
              <circle cx={48 + i * 52} cy="44" r="6" fill={color} opacity={0.85 - i * 0.15} />
              <path
                d={`M${36 + i * 52} 62 Q${48 + i * 52} 52 ${60 + i * 52} 62`}
                fill={color}
                opacity={0.35}
              />
              <rect x={34 + i * 52} y="78" width="28" height="8" rx="4" fill="white" />
            </motion.g>
          ))}
        </svg>
      </div>
    );
  }

  if (section === 'departments') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 3, repeat: Infinity }} />
          <rect x="78" y="28" width="44" height="24" rx="8" fill="white" />
          <motion.rect x="34" y="68" width="36" height="22" rx="8" fill="white" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />
          <motion.rect x="82" y="68" width="36" height="22" rx="8" fill="white" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.2, delay: 0.15, repeat: Infinity }} />
          <motion.rect x="130" y="68" width="36" height="22" rx="8" fill="white" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.2, delay: 0.3, repeat: Infinity }} />
          <path d="M100 52 L52 68 M100 52 L100 68 M100 52 L148 68" stroke={color} strokeWidth="2" fill="none" />
        </svg>
      </div>
    );
  }

  if (section === 'ats' || section === 'onboarding') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.6, repeat: Infinity }} />
          {[0, 1, 2, 3].map((i) => (
            <motion.g key={i} animate={{ x: [0, 3, 0] }} transition={{ duration: 2.4, delay: i * 0.12, repeat: Infinity }}>
              <rect x={28 + i * 38} y="34" width="30" height="52" rx="10" fill="white" />
              <rect x={34 + i * 38} y="42" width="18" height="5" rx="2.5" fill={color} opacity={0.9 - i * 0.12} />
              <rect x={34 + i * 38} y="54" width="14" height="4" rx="2" fill={color} opacity={0.35} />
              <circle cx={43 + i * 38} cy="72" r="5" fill={color} opacity={0.7} />
            </motion.g>
          ))}
        </svg>
      </div>
    );
  }

  if (section === 'contracts' || section === 'decisions' || section === 'reports') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.8, repeat: Infinity }} />
          <motion.rect x="40" y="30" width="70" height="60" rx="12" fill="white" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.4, repeat: Infinity }} />
          <rect x="50" y="40" width="50" height="5" rx="2.5" fill={color} />
          <rect x="50" y="52" width="36" height="4" rx="2" fill={color} opacity={0.35} />
          <rect x="50" y="62" width="42" height="4" rx="2" fill={color} opacity={0.25} />
          <motion.rect x="120" y="36" width="44" height="48" rx="12" fill="white" animate={{ x: [0, 2, 0] }} transition={{ duration: 2.6, repeat: Infinity }} />
          <motion.path
            d="M132 60 L140 68 L156 48"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0.2 }}
            animate={{ pathLength: [0.2, 1, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </svg>
      </div>
    );
  }

  if (section === 'attendance' || section === 'leaves') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.8, repeat: Infinity }} />
          <circle cx="70" cy="60" r="28" fill="white" />
          <motion.line
            x1="70"
            y1="60"
            x2="70"
            y2="42"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ rotate: 360 }}
            style={{ originX: '70px', originY: '60px' }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <rect x="112" y="34" width="56" height="52" rx="12" fill="white" />
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <motion.circle
                key={`${row}-${col}`}
                cx={126 + col * 14}
                cy={50 + row * 14}
                r="3.5"
                fill={color}
                opacity={0.35 + ((row + col) % 3) * 0.2}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.8, delay: (row + col) * 0.1, repeat: Infinity }}
              />
            ))
          )}
        </svg>
      </div>
    );
  }

  if (section === 'education' || section === 'talent' || section === 'evaluations') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.8, repeat: Infinity }} />
          <motion.path
            d="M40 70 L100 40 L160 70 L100 100 Z"
            fill="white"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
          <path d="M100 40 L100 100" stroke={color} strokeWidth="2" />
          <motion.circle
            cx="148"
            cy="48"
            r="10"
            fill={color}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <path d="M148 42 L150 47 L155 47 L151 50 L153 55 L148 52 L143 55 L145 50 L141 47 L146 47 Z" fill="white" />
        </svg>
      </div>
    );
  }

  // offboarding default
  return (
    <div className={className}>
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.8, repeat: Infinity }} />
        <motion.g animate={{ x: [0, 8, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
          <circle cx="70" cy="50" r="14" fill="white" />
          <circle cx="70" cy="46" r="6" fill={color} />
          <path d="M56 72 Q70 58 84 72" fill={color} opacity={0.35} />
          <rect x="58" y="78" width="24" height="8" rx="4" fill="white" />
        </motion.g>
        <motion.path
          d="M110 60 H150"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          animate={{ pathLength: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <path d="M140 50 L154 60 L140 70" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
