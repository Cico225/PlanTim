import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Cpu,
  FileText,
  Folder,
  GraduationCap,
  Grid3X3,
  Lightbulb,
  Lock,
  Mail,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  AlertTriangle,
  ExternalLink,
  Megaphone,
  Coins,
  CircleDot,
} from 'lucide-react';
import {
  GUIDE_CATEGORIES,
  GUIDE_SECTIONS,
  type GuideSection,
  type GuideStatus,
} from './guideContent';

const ACCENT: Record<string, { bar: string; soft: string; text: string; ring: string; blob: string }> = {
  sky: {
    bar: 'from-sky-500 to-cyan-400',
    soft: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-200 dark:ring-sky-800',
    blob: 'bg-sky-400/30',
  },
  indigo: {
    bar: 'from-indigo-500 to-violet-400',
    soft: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    ring: 'ring-indigo-200 dark:ring-indigo-800',
    blob: 'bg-indigo-400/30',
  },
  cyan: {
    bar: 'from-cyan-500 to-teal-400',
    soft: 'bg-cyan-50 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-300',
    ring: 'ring-cyan-200 dark:ring-cyan-800',
    blob: 'bg-cyan-400/30',
  },
  orange: {
    bar: 'from-orange-500 to-amber-400',
    soft: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-200 dark:ring-orange-800',
    blob: 'bg-orange-400/30',
  },
  blue: {
    bar: 'from-blue-500 to-sky-400',
    soft: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-200 dark:ring-blue-800',
    blob: 'bg-blue-400/30',
  },
  emerald: {
    bar: 'from-emerald-500 to-green-400',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    blob: 'bg-emerald-400/30',
  },
  violet: {
    bar: 'from-violet-500 to-purple-400',
    soft: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-200 dark:ring-violet-800',
    blob: 'bg-violet-400/30',
  },
  rose: {
    bar: 'from-rose-500 to-pink-400',
    soft: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    ring: 'ring-rose-200 dark:ring-rose-800',
    blob: 'bg-rose-400/30',
  },
  amber: {
    bar: 'from-amber-500 to-yellow-400',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-800',
    blob: 'bg-amber-400/30',
  },
  slate: {
    bar: 'from-slate-500 to-gray-400',
    soft: 'bg-slate-50 dark:bg-slate-900/40',
    text: 'text-slate-700 dark:text-slate-300',
    ring: 'ring-slate-200 dark:ring-slate-700',
    blob: 'bg-slate-400/30',
  },
  fuchsia: {
    bar: 'from-fuchsia-500 to-pink-400',
    soft: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    text: 'text-fuchsia-700 dark:text-fuchsia-300',
    ring: 'ring-fuchsia-200 dark:ring-fuchsia-800',
    blob: 'bg-fuchsia-400/30',
  },
  teal: {
    bar: 'from-teal-500 to-cyan-400',
    soft: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    ring: 'ring-teal-200 dark:ring-teal-800',
    blob: 'bg-teal-400/30',
  },
  red: {
    bar: 'from-red-500 to-rose-400',
    soft: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-200 dark:ring-red-800',
    blob: 'bg-red-400/30',
  },
  pink: {
    bar: 'from-pink-500 to-rose-400',
    soft: 'bg-pink-50 dark:bg-pink-950/40',
    text: 'text-pink-700 dark:text-pink-300',
    ring: 'ring-pink-200 dark:ring-pink-800',
    blob: 'bg-pink-400/30',
  },
  green: {
    bar: 'from-green-500 to-emerald-400',
    soft: 'bg-green-50 dark:bg-green-950/40',
    text: 'text-green-700 dark:text-green-300',
    ring: 'ring-green-200 dark:ring-green-800',
    blob: 'bg-green-400/30',
  },
  lime: {
    bar: 'from-lime-500 to-green-400',
    soft: 'bg-lime-50 dark:bg-lime-950/40',
    text: 'text-lime-800 dark:text-lime-300',
    ring: 'ring-lime-200 dark:ring-lime-800',
    blob: 'bg-lime-400/30',
  },
  yellow: {
    bar: 'from-yellow-500 to-amber-400',
    soft: 'bg-yellow-50 dark:bg-yellow-950/40',
    text: 'text-yellow-800 dark:text-yellow-300',
    ring: 'ring-yellow-200 dark:ring-yellow-800',
    blob: 'bg-yellow-400/30',
  },
  purple: {
    bar: 'from-purple-500 to-violet-400',
    soft: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    ring: 'ring-purple-200 dark:ring-purple-800',
    blob: 'bg-purple-400/30',
  },
};

const ICONS: Record<string, typeof BookOpen> = {
  spark: Sparkles,
  lock: Lock,
  grid: Grid3X3,
  users: Users,
  briefcase: Briefcase,
  folder: Folder,
  book: BookOpen,
  mail: Mail,
  bell: Bell,
  shield: Shield,
  cloud: Cloud,
  cpu: Cpu,
  calendar: Calendar,
  settings: Settings,
  package: Package,
  shop: ShoppingBag,
  coin: Coins,
  hr: Users,
  userPlus: UserPlus,
  file: FileText,
  grad: GraduationCap,
  star: Star,
  award: Award,
  trend: TrendingUp,
  megaphone: Megaphone,
};

const STATUS_LABEL: Record<GuideStatus, { label: string; className: string }> = {
  live: {
    label: 'Aktivno',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  partial: {
    label: 'Djelimično',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  planned: {
    label: 'U planu',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

const STORAGE_KEY = 'plantim-guide-read';

function loadRead(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export default function UserGuide() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | GuideSection['category']>('all');
  const [activeId, setActiveId] = useState('intro');
  const [readIds, setReadIds] = useState<string[]>(() => loadRead());
  const [activeStep, setActiveStep] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GUIDE_SECTIONS.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.overview.toLowerCase().includes(q) ||
        s.features.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [search, category]);

  const active = GUIDE_SECTIONS.find((s) => s.id === activeId) || GUIDE_SECTIONS[0];
  const accent = ACCENT[active.accent] || ACCENT.sky;
  const Icon = ICONS[active.icon] || BookOpen;
  const progress = Math.round((readIds.length / GUIDE_SECTIONS.length) * 100);

  useEffect(() => {
    setActiveStep(0);
  }, [activeId]);

  useEffect(() => {
    if (!filtered.some((s) => s.id === activeId) && filtered[0]) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  const markRead = (id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const goRelated = (id: string) => {
    setActiveId(id);
    markRead(id);
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className={`absolute -left-24 -top-24 h-72 w-72 rounded-full blur-3xl ${accent.blob}`}
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-16 top-40 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10"
          animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.7),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.65),transparent_55%)]" />
      </div>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-dark-700/60 dark:bg-dark-800/70 sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400"
            >
              PlanTim · Interaktivno uputstvo
            </motion.p>
            <h1 className="font-[family-name:var(--font-display,inherit)] text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Naučite platformu
              <span className="bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">
                {' '}
                korak po korak
              </span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
              Detaljni vodič kroz sve PlanTim module i Planika hubove — sa animiranim koracima, statusom
              funkcionalnosti i direktnim linkovima u aplikaciju.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-dark-700 dark:text-gray-200">
                <CircleDot className="h-3.5 w-3.5 text-primary-500" />
                {GUIDE_SECTIONS.length} poglavlja
              </div>
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-dark-700 dark:text-gray-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Pročitano {readIds.length}/{GUIDE_SECTIONS.length}
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
              <span>Napredak čitanja</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">{progress}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              />
            </div>
            <HeroOrbit />
          </div>
        </div>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Nav */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraži module..."
              className="w-full rounded-2xl border border-gray-200 bg-white/80 py-2.5 pl-10 pr-3 text-sm outline-none ring-primary-300 focus:ring-2 dark:border-dark-600 dark:bg-dark-800/80 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip active={category === 'all'} onClick={() => setCategory('all')} label="Sve" />
            {GUIDE_CATEGORIES.map((c) => (
              <FilterChip
                key={c.id}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
                label={c.label}
              />
            ))}
          </div>

          <nav className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 xl:max-h-[calc(100vh-14rem)]">
            {GUIDE_CATEGORIES.filter((c) => category === 'all' || category === c.id).map((cat) => {
              const items = filtered.filter((s) => s.category === cat.id);
              if (!items.length) return null;
              return (
                <div key={cat.id}>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {cat.label}
                  </p>
                  <div className="space-y-1">
                    {items.map((section) => {
                      const SIcon = ICONS[section.icon] || BookOpen;
                      const isActive = section.id === activeId;
                      const isRead = readIds.includes(section.id);
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => {
                            setActiveId(section.id);
                            markRead(section.id);
                          }}
                          className={`group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                            isActive
                              ? 'bg-primary-50 text-primary-800 shadow-sm ring-1 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-800'
                              : 'text-gray-700 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-dark-800/80'
                          }`}
                        >
                          <SIcon className="h-4 w-4 shrink-0 opacity-70" />
                          <span className="min-w-0 flex-1 truncate font-medium">{section.title}</span>
                          {isRead && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.article
            key={active.id}
            initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.35 }}
            className={`overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-sm backdrop-blur-xl dark:border-dark-700/70 dark:bg-dark-800/80 ring-1 ${accent.ring}`}
          >
            <div className={`h-1.5 bg-gradient-to-r ${accent.bar}`} />

            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <motion.div
                    initial={{ scale: 0.8, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent.soft} ${accent.text}`}
                  >
                    <Icon className="h-7 w-7" />
                  </motion.div>
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{active.title}</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_LABEL[active.status].className}`}
                      >
                        {STATUS_LABEL[active.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{active.subtitle}</p>
                  </div>
                </div>

                {active.route && (
                  <Link
                    to={active.route}
                    className="inline-flex items-center gap-2 self-start rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  >
                    Otvori modul
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>

              <p className="mt-5 max-w-3xl text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
                {active.overview}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {active.features.map((feature, i) => (
                  <motion.span
                    key={feature}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${accent.soft} ${accent.text}`}
                  >
                    {feature}
                  </motion.span>
                ))}
              </div>

              {/* Steps */}
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Koraci ({active.steps.length})
                  </h3>
                  <div className="flex gap-1">
                    {active.steps.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveStep(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === activeStep ? 'w-6 bg-primary-500' : 'w-2 bg-gray-300 dark:bg-dark-600'
                        }`}
                        aria-label={`Korak ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${active.id}-${activeStep}`}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.28 }}
                      className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50 p-5 dark:border-dark-600 dark:from-dark-800 dark:to-dark-900 sm:p-6"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${accent.bar}`}
                        >
                          {activeStep + 1}
                        </span>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {active.steps[activeStep]?.title}
                        </h4>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {active.steps[activeStep]?.body}
                      </p>

                      {active.steps[activeStep]?.tip && (
                        <div className="mt-4 flex gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{active.steps[activeStep].tip}</span>
                        </div>
                      )}
                      {active.steps[activeStep]?.warn && (
                        <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{active.steps[activeStep].warn}</span>
                        </div>
                      )}

                      <div className="mt-5 flex items-center justify-between">
                        <button
                          type="button"
                          disabled={activeStep === 0}
                          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                          className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-dark-700"
                        >
                          Prethodni
                        </button>
                        <button
                          type="button"
                          disabled={activeStep >= active.steps.length - 1}
                          onClick={() => setActiveStep((s) => Math.min(active.steps.length - 1, s + 1))}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40"
                        >
                          Sljedeći
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* All steps list */}
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {active.steps.map((step, i) => (
                    <motion.button
                      key={step.title}
                      type="button"
                      onClick={() => setActiveStep(i)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i }}
                      className={`rounded-xl border p-3 text-left transition ${
                        i === activeStep
                          ? 'border-primary-300 bg-primary-50/80 dark:border-primary-700 dark:bg-primary-950/30'
                          : 'border-gray-100 bg-white/60 hover:border-gray-200 dark:border-dark-600 dark:bg-dark-800/40'
                      }`}
                    >
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Korak {i + 1}
                      </div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{step.title}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {!!active.related?.length && (
                <div className="mt-8 border-t border-gray-100 pt-6 dark:border-dark-600">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Povezano
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {active.related.map((relId) => {
                      const rel = GUIDE_SECTIONS.find((s) => s.id === relId);
                      if (!rel) return null;
                      return (
                        <button
                          key={relId}
                          type="button"
                          onClick={() => goRelated(relId)}
                          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-200"
                        >
                          {rel.title}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
          : 'bg-white/80 text-gray-600 ring-1 ring-gray-200 dark:bg-dark-800 dark:text-gray-300 dark:ring-dark-600'
      }`}
    >
      {label}
    </button>
  );
}

function HeroOrbit() {
  return (
    <div className="relative mx-auto mt-5 h-28 w-28">
      <motion.div
        className="absolute inset-0 rounded-full border border-dashed border-primary-300/60 dark:border-primary-700/60"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-3 rounded-full border border-teal-300/50 dark:border-teal-700/50"
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-teal-500 text-lg font-bold text-white shadow-lg"
        >
          P
        </motion.div>
      </div>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-400"
          animate={{
            rotate: 360,
          }}
          transition={{ duration: 10 + i * 3, repeat: Infinity, ease: 'linear' }}
          style={{
            transformOrigin: `${20 + i * 8}px center`,
          }}
        />
      ))}
    </div>
  );
}
