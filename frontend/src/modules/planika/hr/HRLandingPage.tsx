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
  const med = `${color}44`;

  // 1 — Dashboard: animated bar chart with pulsing metric cards
  if (section === 'dashboard') {
    const bars = [
      { x: 32, h: 48 },
      { x: 56, h: 62 },
      { x: 80, h: 38 },
      { x: 104, h: 56 },
      { x: 128, h: 44 },
    ];
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          {bars.map((b, i) => (
            <motion.rect
              key={i}
              x={b.x}
              width="16"
              rx="4"
              fill={color}
              opacity={0.7}
              initial={{ y: 94, height: 0 }}
              animate={{ y: 94 - b.h, height: b.h }}
              transition={{ duration: 0.8, delay: i * 0.12, repeat: Infinity, repeatType: 'reverse', repeatDelay: 1.5 }}
            />
          ))}
          <motion.rect x="150" y="28" width="30" height="14" rx="5" fill="white" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          <rect x="155" y="32" width="20" height="3" rx="1.5" fill={color} opacity={0.6} />
          <motion.rect x="150" y="50" width="30" height="14" rx="5" fill="white" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, delay: 0.4, repeat: Infinity }} />
          <rect x="155" y="54" width="14" height="3" rx="1.5" fill={color} opacity={0.4} />
        </svg>
      </div>
    );
  }

  // 2 — ATS: funnel with candidates flowing through stages
  if (section === 'ats') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3.2, repeat: Infinity }} />
          <path d="M30 30 L170 30 L140 95 L60 95 Z" fill="white" opacity={0.85} />
          {[0, 1, 2].map((i) => (
            <motion.line key={i} x1={52 + i * 22} y1="30" x2={68 + i * 10} y2="95" stroke={color} strokeWidth="1" opacity={0.2} />
          ))}
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={`dot-${i}`}
              r="5"
              fill={color}
              opacity={0.85 - i * 0.2}
              initial={{ cx: 60 + i * 30, cy: 34 }}
              animate={{ cx: 80 + i * 10, cy: 90 }}
              transition={{ duration: 2.5, delay: i * 0.6, repeat: Infinity, repeatDelay: 0.5 }}
            />
          ))}
          <rect x="75" y="88" width="50" height="5" rx="2.5" fill={color} opacity={0.3} />
        </svg>
      </div>
    );
  }

  // 3 — Onboarding: checklist with items checking off one by one
  if (section === 'onboarding') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.8, repeat: Infinity }} />
          <rect x="40" y="24" width="120" height="72" rx="12" fill="white" />
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <motion.rect
                x="52"
                y={34 + i * 16}
                width="12"
                height="12"
                rx="3"
                fill="none"
                stroke={color}
                strokeWidth="2"
                animate={{ fill: ['transparent', med, 'transparent'] }}
                transition={{ duration: 3, delay: i * 0.7, repeat: Infinity }}
              />
              <motion.path
                d={`M${55} ${40 + i * 16} L${58} ${43 + i * 16} L${62} ${37 + i * 16}`}
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 3, delay: i * 0.7, repeat: Infinity }}
              />
              <rect x="72" y={37 + i * 16} width={56 - i * 8} height="5" rx="2.5" fill={color} opacity={0.25 + i * 0.05} />
            </g>
          ))}
          <motion.circle cx="150" cy="80" r="8" fill={color} opacity={0.15} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          <motion.path d="M146 80 L149 83 L155 76" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
        </svg>
      </div>
    );
  }

  // 4 — Contracts: document with signature pen drawing
  if (section === 'contracts') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 3, repeat: Infinity }} />
          <motion.rect x="50" y="22" width="72" height="80" rx="8" fill="white" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />
          <rect x="60" y="32" width="52" height="4" rx="2" fill={color} opacity={0.7} />
          <rect x="60" y="42" width="40" height="3" rx="1.5" fill={color} opacity={0.3} />
          <rect x="60" y="50" width="46" height="3" rx="1.5" fill={color} opacity={0.25} />
          <rect x="60" y="58" width="34" height="3" rx="1.5" fill={color} opacity={0.2} />
          <motion.path
            d="M64 80 Q72 72 80 80 Q88 88 96 78"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.5, 0.8, 1] }}
          />
          <motion.g animate={{ x: [0, 32, 32, 0], y: [0, -2, -2, 0] }} transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.5, 0.8, 1] }}>
            <path d="M60 82 L56 96 L64 88 Z" fill={color} opacity={0.6} />
            <rect x="58" y="70" width="4" height="16" rx="1" fill={color} opacity={0.5} transform="rotate(-25 60 78)" />
          </motion.g>
          <motion.rect x="132" y="30" width="36" height="44" rx="8" fill="white" animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          <rect x="138" y="38" width="24" height="3" rx="1.5" fill={color} opacity={0.35} />
          <rect x="138" y="46" width="18" height="3" rx="1.5" fill={color} opacity={0.25} />
          <circle cx="150" cy="62" r="6" fill={color} opacity={0.15} />
        </svg>
      </div>
    );
  }

  // 5 — Employees: profile cards with avatar bobbing
  if (section === 'employees') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          {[0, 1, 2].map((i) => (
            <motion.g key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 2.2 + i * 0.3, delay: i * 0.2, repeat: Infinity }}>
              <rect x={30 + i * 52} y="28" width="44" height="64" rx="12" fill="white" />
              <circle cx={52 + i * 52} cy="48" r="10" fill={color} opacity={0.15} />
              <circle cx={52 + i * 52} cy="46" r="5" fill={color} opacity={0.65 - i * 0.1} />
              <path d={`M${42 + i * 52} 58 Q${52 + i * 52} 52 ${62 + i * 52} 58`} fill={color} opacity={0.25} />
              <rect x={40 + i * 52} y="66" width="24" height="4" rx="2" fill={color} opacity={0.3} />
              <rect x={44 + i * 52} y="74" width="16" height="3" rx="1.5" fill={color} opacity={0.18} />
            </motion.g>
          ))}
        </svg>
      </div>
    );
  }

  // 6 — Departments: org chart tree with pulsing nodes
  if (section === 'departments') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 3, repeat: Infinity }} />
          <motion.rect x="78" y="24" width="44" height="22" rx="8" fill="white" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          <circle cx="100" cy="35" r="4" fill={color} opacity={0.7} />
          <path d="M100 46 L52 62 M100 46 L100 62 M100 46 L148 62" stroke={color} strokeWidth="1.5" fill="none" opacity={0.4} />
          {[52, 100, 148].map((cx, i) => (
            <motion.g key={i} animate={{ y: [0, -3, 0] }} transition={{ duration: 2, delay: i * 0.25, repeat: Infinity }}>
              <rect x={cx - 18} y="62" width="36" height="18" rx="6" fill="white" />
              <circle cx={cx} cy="71" r="3" fill={color} opacity={0.5 + i * 0.1} />
            </motion.g>
          ))}
          {[36, 68, 84, 116, 132, 164].map((cx, i) => (
            <motion.circle key={i} cx={cx} cy="96" r="3.5" fill={color} opacity={0.2 + (i % 3) * 0.1} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.8, delay: i * 0.15, repeat: Infinity }} />
          ))}
          <path d="M52 80 L36 92 M52 80 L68 92 M100 80 L84 92 M100 80 L116 92 M148 80 L132 92 M148 80 L164 92" stroke={color} strokeWidth="1" fill="none" opacity={0.25} />
        </svg>
      </div>
    );
  }

  // 7 — Attendance: clock face with rotating hand + time grid
  if (section === 'attendance') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <circle cx="68" cy="60" r="30" fill="white" />
          <circle cx="68" cy="60" r="27" fill="none" stroke={color} strokeWidth="1" opacity={0.2} />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
            const a = (i * 30 * Math.PI) / 180;
            return <circle key={i} cx={68 + Math.sin(a) * 23} cy={60 - Math.cos(a) * 23} r="1.5" fill={color} opacity={0.35} />;
          })}
          <motion.line x1="68" y1="60" x2="68" y2="40" stroke={color} strokeWidth="2.5" strokeLinecap="round" animate={{ rotate: 360 }} style={{ originX: '68px', originY: '60px' }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} />
          <motion.line x1="68" y1="60" x2="68" y2="46" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity={0.5} animate={{ rotate: 360 }} style={{ originX: '68px', originY: '60px' }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} />
          <circle cx="68" cy="60" r="2.5" fill={color} />
          <rect x="112" y="30" width="60" height="60" rx="10" fill="white" />
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.g key={i}>
              <rect x="118" y={38 + i * 10} width="48" height="6" rx="3" fill={color} opacity={0.08} />
              <motion.rect x="118" y={38 + i * 10} width={20 + ((i * 13) % 30)} height="6" rx="3" fill={color} opacity={0.35} animate={{ width: [20 + ((i * 13) % 30), 30 + ((i * 7) % 20), 20 + ((i * 13) % 30)] }} transition={{ duration: 3, delay: i * 0.3, repeat: Infinity }} />
            </motion.g>
          ))}
        </svg>
      </div>
    );
  }

  // 8 — Leaves: calendar with days highlighting
  if (section === 'leaves') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <rect x="32" y="24" width="136" height="76" rx="12" fill="white" />
          <rect x="32" y="24" width="136" height="18" rx="12" fill={color} opacity={0.15} />
          <rect x="32" y="40" width="136" height="2" rx="1" fill={color} opacity={0.1} />
          {[0, 1, 2, 3, 4, 5, 6].map((col) =>
            [0, 1, 2, 3].map((row) => {
              const highlighted = (col === 2 && row === 1) || (col === 3 && row === 1) || (col === 4 && row === 1) || (col === 1 && row === 2);
              return (
                <motion.rect
                  key={`${col}-${row}`}
                  x={38 + col * 18}
                  y={46 + row * 13}
                  width="12"
                  height="9"
                  rx="2.5"
                  fill={highlighted ? color : color}
                  opacity={highlighted ? 0.5 : 0.08}
                  animate={highlighted ? { opacity: [0.3, 0.6, 0.3] } : {}}
                  transition={highlighted ? { duration: 2, delay: col * 0.2, repeat: Infinity } : {}}
                />
              );
            })
          )}
        </svg>
      </div>
    );
  }

  // 9 — Evaluations: gauge/meter with needle swinging
  if (section === 'evaluations') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <path d="M50 85 A50 50 0 0 1 150 85" fill="none" stroke={color} strokeWidth="6" opacity={0.12} strokeLinecap="round" />
          <motion.path
            d="M50 85 A50 50 0 0 1 150 85"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            opacity={0.6}
            initial={{ pathLength: 0.2 }}
            animate={{ pathLength: [0.2, 0.75, 0.2] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.line
            x1="100"
            y1="85"
            x2="100"
            y2="48"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            animate={{ rotate: [-60, 60, -60] }}
            style={{ originX: '100px', originY: '85px' }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx="100" cy="85" r="5" fill={color} opacity={0.7} />
          {[0, 1, 2].map((i) => (
            <motion.g key={i} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}>
              <rect x={40 + i * 44} y="96" width="32" height="6" rx="3" fill="white" />
              <rect x={44 + i * 44} y="97.5" width={12 + i * 4} height="3" rx="1.5" fill={color} opacity={0.3 + i * 0.1} />
            </motion.g>
          ))}
        </svg>
      </div>
    );
  }

  // 10 — Education: graduation cap with floating books
  if (section === 'education') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <path d="M60 55 L100 35 L140 55 L100 75 Z" fill="white" />
            <path d="M60 55 L100 75 L140 55" fill="none" stroke={color} strokeWidth="1.5" opacity={0.4} />
            <rect x="98" y="35" width="4" height="50" rx="2" fill={color} opacity={0.3} />
            <circle cx="100" cy="88" r="4" fill={color} opacity={0.35} />
          </motion.g>
          {[0, 1, 2].map((i) => (
            <motion.g key={i} animate={{ y: [0, -4, 0], rotate: [0, 3, 0] }} transition={{ duration: 2, delay: 0.5 + i * 0.4, repeat: Infinity }}>
              <rect x={30 + i * 18} y={40 + i * 6} width="14" height="28" rx="3" fill={color} opacity={0.2 + i * 0.1} />
              <rect x={33 + i * 18} y={46 + i * 6} width="8" height="2" rx="1" fill="white" opacity={0.8} />
            </motion.g>
          ))}
          <motion.rect x="148" y="42" width="22" height="32" rx="6" fill="white" animate={{ y: [0, -2, 0] }} transition={{ duration: 2.2, delay: 0.3, repeat: Infinity }} />
          <rect x="152" y="50" width="14" height="3" rx="1.5" fill={color} opacity={0.4} />
          <rect x="152" y="56" width="10" height="2" rx="1" fill={color} opacity={0.2} />
        </svg>
      </div>
    );
  }

  // 11 — Talent: star constellation with connecting lines
  if (section === 'talent') {
    const stars = [
      { cx: 50, cy: 40 },
      { cx: 90, cy: 30 },
      { cx: 140, cy: 45 },
      { cx: 70, cy: 70 },
      { cx: 120, cy: 75 },
      { cx: 160, cy: 68 },
    ];
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          {[
            [0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [1, 4], [2, 5],
          ].map(([a, b], i) => (
            <motion.line
              key={i}
              x1={stars[a].cx}
              y1={stars[a].cy}
              x2={stars[b].cx}
              y2={stars[b].cy}
              stroke={color}
              strokeWidth="1"
              opacity={0.2}
              animate={{ opacity: [0.1, 0.35, 0.1] }}
              transition={{ duration: 2.5, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
          {stars.map((s, i) => (
            <motion.g key={i} animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}>
              <circle cx={s.cx} cy={s.cy} r="8" fill="white" />
              <path
                d={`M${s.cx} ${s.cy - 5} L${s.cx + 1.5} ${s.cy - 1.5} L${s.cx + 5} ${s.cy - 1.5} L${s.cx + 2.5} ${s.cy + 1} L${s.cx + 3.5} ${s.cy + 5} L${s.cx} ${s.cy + 2.5} L${s.cx - 3.5} ${s.cy + 5} L${s.cx - 2.5} ${s.cy + 1} L${s.cx - 5} ${s.cy - 1.5} L${s.cx - 1.5} ${s.cy - 1.5} Z`}
                fill={color}
                opacity={0.6 + (i % 3) * 0.1}
              />
            </motion.g>
          ))}
        </svg>
      </div>
    );
  }

  // 12 — Decisions: gavel with stamp animation
  if (section === 'decisions') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <rect x="36" y="30" width="60" height="64" rx="10" fill="white" />
          <rect x="44" y="38" width="44" height="4" rx="2" fill={color} opacity={0.6} />
          <rect x="44" y="48" width="36" height="3" rx="1.5" fill={color} opacity={0.25} />
          <rect x="44" y="56" width="40" height="3" rx="1.5" fill={color} opacity={0.2} />
          <motion.g
            animate={{ rotate: [0, -25, 0] }}
            style={{ originX: '148px', originY: '80px' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <rect x="140" y="40" width="16" height="42" rx="4" fill={color} opacity={0.5} />
            <rect x="134" y="36" width="28" height="12" rx="4" fill={color} opacity={0.7} />
          </motion.g>
          <rect x="120" y="82" width="52" height="8" rx="4" fill={color} opacity={0.2} />
          <motion.circle
            cx="66"
            cy="78"
            r="10"
            fill={color}
            opacity={0.12}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 0.25, 0.12] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.text x="62" y="82" fontSize="10" fill={color} opacity={0.5} fontWeight="bold" animate={{ opacity: [0, 0.6, 0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            ✓
          </motion.text>
        </svg>
      </div>
    );
  }

  // 13 — Offboarding: person walking out with door
  if (section === 'offboarding') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <rect x="110" y="28" width="50" height="68" rx="8" fill="white" />
          <motion.rect x="110" y="28" width="30" height="68" rx="8" fill={color} opacity={0.1} animate={{ width: [30, 10, 30] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
          <circle cx="133" cy="62" r="3" fill={color} opacity={0.5} />
          <motion.g animate={{ x: [0, -30, -30], opacity: [1, 1, 0] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.6, 1] }}>
            <circle cx="80" cy="48" r="10" fill="white" />
            <circle cx="80" cy="46" r="5" fill={color} opacity={0.6} />
            <path d="M68 68 Q80 56 92 68" fill={color} opacity={0.25} />
            <rect x="70" y="72" width="20" height="14" rx="4" fill={color} opacity={0.15} />
          </motion.g>
          <motion.path
            d="M52 60 L40 60"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ opacity: [0, 0.6, 0], x: [-10, -30, -30] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.6, 1] }}
          />
          <motion.path
            d="M40 55 L34 60 L40 65"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            animate={{ opacity: [0, 0.6, 0], x: [-10, -30, -30] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.6, 1] }}
          />
        </svg>
      </div>
    );
  }

  // 14 — Reports: pie chart + table rows
  if (section === 'reports') {
    return (
      <div className={className}>
        <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
          <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
          <circle cx="70" cy="60" r="28" fill="white" />
          <motion.path
            d="M70 60 L70 32 A28 28 0 0 1 96 50 Z"
            fill={color}
            opacity={0.6}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <motion.path
            d="M70 60 L96 50 A28 28 0 0 1 82 86 Z"
            fill={color}
            opacity={0.35}
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 2.5, delay: 0.4, repeat: Infinity }}
          />
          <motion.path
            d="M70 60 L82 86 A28 28 0 1 1 70 32 Z"
            fill={color}
            opacity={0.18}
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 2.5, delay: 0.8, repeat: Infinity }}
          />
          <rect x="112" y="30" width="60" height="60" rx="10" fill="white" />
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.rect
              key={i}
              x="118"
              y={38 + i * 10}
              width={40 - i * 4}
              height="5"
              rx="2.5"
              fill={color}
              opacity={0.15 + i * 0.06}
              animate={{ width: [40 - i * 4, 50 - i * 3, 40 - i * 4] }}
              transition={{ duration: 3, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </svg>
      </div>
    );
  }

  // fallback
  return (
    <div className={className}>
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <motion.rect x="16" y="16" width="168" height="88" rx="20" fill={soft} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
        <motion.circle cx="100" cy="60" r="20" fill="white" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} />
        <circle cx="100" cy="60" r="8" fill={color} opacity={0.4} />
      </svg>
    </div>
  );
}
