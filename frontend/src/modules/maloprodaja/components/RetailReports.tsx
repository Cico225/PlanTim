import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar as CalendarIcon,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  List,
  Loader2,
  Package,
  Sparkles,
  Star,
  Store,
  User,
  Wrench,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getRetailReportsOverview } from '@/services/retailControlPlansService';
import { formatDate } from '@/utils/dateFormat';

const LIVE_REFRESH_MS = 30_000;

const MONTH_OPTIONS = [
  { value: 6, label: '6 mjeseci' },
  { value: 12, label: '12 mjeseci' },
  { value: 24, label: '24 mjeseca' },
];

const PIE_FALLBACK = ['#0d9488', '#0284c7', '#6366f1', '#f59e0b', '#ea580c', '#64748b', '#14b8a6', '#38bdf8'];
const RATING_COLORS = ['#dc2626', '#ea580c', '#f59e0b', '#84cc16', '#16a34a'];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { y: 16, scale: 0.98 },
  show: {
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
  },
};

function formatNumber(n: number, fractionDigits = 0) {
  return new Intl.NumberFormat('bs-BA', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n ?? 0);
}

function formatTime(ts: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-800/95">
      {label && <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey ?? p.name} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.color || p.fill }} />
          {p.name}: {formatNumber(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Store;
  accent: string;
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-800/70"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
        style={{ background: accent, opacity: 0.2 }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      variants={item}
      className={`rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-800/70 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </motion.section>
  );
}

function EmptyChart({ text = 'Još nema podataka za prikaz.' }: { text?: string }) {
  return <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">{text}</p>;
}

function DonutChart({ data }: { data: { name: string; value: number; color?: string }[] }) {
  if (!data.length || data.every((d) => !d.value)) return <EmptyChart />;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
            animationDuration={900}
          >
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={entry.color || PIE_FALLBACK[i % PIE_FALLBACK.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

type ViewKey = 'overview' | 'controls' | 'activities' | 'list';

export default function RetailReports({ listView }: { listView: ReactNode }) {
  const [months, setMonths] = useState(12);
  const [activeView, setActiveView] = useState<ViewKey>('overview');

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['retail-reports-overview', months],
    queryFn: () => getRetailReportsOverview({ months }),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: LIVE_REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  const kpis = data?.kpis;

  const views = [
    { key: 'overview' as const, label: 'Pregled', icon: Activity },
    { key: 'controls' as const, label: 'Kontrole', icon: ClipboardCheck },
    { key: 'activities' as const, label: 'Aktivnosti i edukacije', icon: ClipboardList },
    { key: 'list' as const, label: 'Evidencija i kalendar', icon: List },
  ];

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="retail-report-blob absolute -left-20 -top-24 h-72 w-72 rounded-full bg-teal-400/25 blur-3xl dark:bg-teal-500/15" />
        <div className="retail-report-blob-slow absolute -right-16 top-10 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/10" />
        <div className="retail-report-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
      </div>
      <style>{`
        @keyframes retail-report-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(24px, -16px); }
        }
        @keyframes retail-report-drift-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 18px); }
        }
        .retail-report-blob { animation: retail-report-drift 14s ease-in-out infinite; }
        .retail-report-blob-slow { animation: retail-report-drift-slow 18s ease-in-out infinite; }
      `}</style>

      <motion.header
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-teal-200/50 bg-gradient-to-br from-teal-700 via-teal-600 to-sky-700 p-6 text-white shadow-lg dark:border-teal-800/40 sm:p-8"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: 0.3,
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(125,211,252,0.35), transparent 35%)',
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Živa analitika maloprodaje
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                Uživo · ažurirano {formatTime(dataUpdatedAt)}
              </span>
            </div>
            <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
              <BarChart3 className="h-8 w-8 text-teal-100" />
              Izvještaji
            </h2>
            <p className="mt-2 max-w-xl text-sm text-teal-50/90 sm:text-base">
              Planovi, obilasci, kontrole, inventure i edukacije — grafički pregled u realnom vremenu.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-sm text-white backdrop-blur outline-none focus:ring-2 focus:ring-white/40"
            >
              {MONTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="text-slate-900">
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50"
            >
              {isFetching ? 'Ažuriranje…' : 'Osvježi'}
            </button>
          </div>
        </div>
      </motion.header>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        </div>
      ) : error || !data || !kpis ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/30">
          <p className="text-rose-700 dark:text-rose-300">Greška pri učitavanju izvještaja.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm text-white"
          >
            Pokušaj ponovo
          </button>
        </div>
      ) : (
        <>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <KpiCard
              label="Aktivni planovi"
              value={formatNumber(kpis.active_plans)}
              hint={`${formatNumber(kpis.total_plans)} ukupno planova`}
              icon={ClipboardList}
              accent="#0d9488"
            />
            <KpiCard
              label="Realizacija aktivnosti"
              value={`${formatNumber(kpis.completion_rate, 1)}%`}
              hint={`${kpis.activities_completed}/${kpis.activities_total} · ${kpis.activities_overdue} kasni`}
              icon={CheckCircle2}
              accent="#16a34a"
            />
            <KpiCard
              label="Kontrole u periodu"
              value={formatNumber(kpis.controls_period)}
              hint={`${kpis.controls_this_month} ovaj mjesec · ${kpis.stores_visited} prodavnica`}
              icon={ClipboardCheck}
              accent="#0284c7"
            />
            <KpiCard
              label="Otvorene mjere"
              value={formatNumber(kpis.open_measures)}
              hint={`${kpis.overdue_measures} s isteklim rokom`}
              icon={Wrench}
              accent="#ea580c"
            />
          </motion.div>

          <div className="flex flex-wrap gap-2">
            {views.map((v) => {
              const Icon = v.icon;
              const active = activeView === v.key;
              return (
                <motion.button
                  key={v.key}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveView(v.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                      : 'border border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {v.label}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {activeView === 'list' ? (
              <motion.div key="list" initial={{ y: 8 }} animate={{ y: 0 }} exit={{ y: 8 }}>
                {listView}
              </motion.div>
            ) : (
              <motion.div
                key={activeView}
                variants={container}
                initial="hidden"
                animate="show"
                exit={{ y: 8 }}
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
              >
                {activeView === 'overview' && (
                  <>
                    <Panel
                      title="Aktivnosti kroz vrijeme"
                      subtitle={`Planirane vs završene aktivnosti u zadnjih ${months} mjeseci`}
                      className="lg:col-span-2"
                    >
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={data.activity_trend}>
                            <defs>
                              <linearGradient id="retailPlannedFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0284c7" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="retailDoneFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={32} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="planned" name="Planirano" stroke="#0284c7" strokeWidth={2.5} fill="url(#retailPlannedFill)" animationDuration={1200} />
                            <Area type="monotone" dataKey="completed" name="Završeno" stroke="#16a34a" strokeWidth={2.5} fill="url(#retailDoneFill)" animationDuration={1200} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>

                    <Panel title="Status aktivnosti" subtitle="Aktivnosti koje kasne su izdvojene">
                      <DonutChart data={data.activity_status} />
                    </Panel>

                    <Panel title="Naredne i zakašnjele aktivnosti" subtitle="Otvorene aktivnosti do 14 dana unaprijed">
                      {data.upcoming_activities.length === 0 ? (
                        <EmptyChart text="Nema otvorenih aktivnosti u narednih 14 dana." />
                      ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                          {data.upcoming_activities.map((a) => (
                            <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                  {a.store_name}
                                  {a.store_code ? ` (${a.store_code})` : ''}
                                </p>
                                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
                                  {a.plan_title && <span className="truncate">{a.plan_title}</span>}
                                  {a.assigned_to_name && (
                                    <span className="inline-flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {a.assigned_to_name}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  a.overdue
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                    : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                }`}
                              >
                                {a.overdue ? <AlertTriangle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
                                {formatDate(a.planned_date)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>

                    <Panel title="Kontrole po mjesecima" subtitle="Obilasci i inventure" className="lg:col-span-2">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.controls_trend} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="inspection" name="Obilasci / kontrole" stackId="c" fill="#0d9488" radius={[0, 0, 0, 0]} animationDuration={1000} />
                            <Bar dataKey="inventory" name="Inventure" stackId="c" fill="#6366f1" radius={[6, 6, 0, 0]} animationDuration={1000} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>
                  </>
                )}

                {activeView === 'controls' && (
                  <>
                    <Panel title="Zapažanja po kategorijama" subtitle="U redu vs nije u redu iz zapisnika kontrola" className="lg:col-span-2">
                      {data.observations_by_category.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.observations_by_category} layout="vertical" margin={{ left: 8, right: 16 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <Tooltip content={<ChartTooltip />} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Bar dataKey="ok" name="U redu" stackId="o" fill="#16a34a" animationDuration={1000} />
                              <Bar dataKey="not_ok" name="Nije u redu" stackId="o" fill="#dc2626" radius={[0, 8, 8, 0]} animationDuration={1000} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </Panel>

                    <Panel
                      title="Ocjene prodavnica"
                      subtitle={kpis.avg_store_rating ? `Prosječna ocjena: ${formatNumber(kpis.avg_store_rating, 1)} / 5` : 'Raspodjela ocjena iz kontrola'}
                    >
                      {data.store_ratings.every((r) => !r.value) ? (
                        <EmptyChart />
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.store_ratings}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} width={28} />
                              <Tooltip content={<ChartTooltip />} />
                              <Bar dataKey="value" name="Kontrole" radius={[8, 8, 0, 0]} animationDuration={1000}>
                                {data.store_ratings.map((r) => (
                                  <Cell key={r.rating} fill={RATING_COLORS[r.rating - 1]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </Panel>

                    <Panel
                      title="Rezultat inventura"
                      subtitle={`Ukupna razlika u periodu: ${formatNumber(kpis.inventory_difference, 2)} KM · manjkova: ${kpis.inventory_shortages}`}
                    >
                      <DonutChart data={data.inventory_status} />
                    </Panel>

                    <Panel title="Najčešće kontrolisane prodavnice" subtitle="Broj kontrola i prosječna ocjena">
                      {data.top_stores.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <ul className="space-y-3 py-1">
                          {data.top_stores.map((s, idx) => {
                            const max = Math.max(...data.top_stores.map((t) => t.controls), 1);
                            return (
                              <motion.li key={s.name} initial={{ x: -12 }} animate={{ x: 0 }} transition={{ delay: 0.05 * idx }}>
                                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                                  <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                                    <Store className="h-4 w-4 shrink-0 text-teal-600" />
                                    <span className="truncate">{s.name}</span>
                                  </span>
                                  <span className="inline-flex shrink-0 items-center gap-3 tabular-nums">
                                    {s.avg_rating !== null && (
                                      <span className="inline-flex items-center gap-1 text-amber-600">
                                        <Star className="h-3.5 w-3.5 fill-current" />
                                        {formatNumber(s.avg_rating, 1)}
                                      </span>
                                    )}
                                    <span className="font-bold text-slate-900 dark:text-white">{s.controls}</span>
                                  </span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                  <motion.div
                                    className="h-full rounded-full bg-teal-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(s.controls / max) * 100}%` }}
                                    transition={{ duration: 0.9, delay: 0.1 * idx, ease: 'easeOut' }}
                                  />
                                </div>
                              </motion.li>
                            );
                          })}
                        </ul>
                      )}
                    </Panel>

                    <Panel
                      title="Korektivne mjere"
                      subtitle={`${kpis.open_measures} otvorenih · ${kpis.overdue_measures} s isteklim rokom · ${kpis.controls_locked} zaključanih zapisnika`}
                    >
                      <DonutChart data={data.measures_status} />
                    </Panel>
                  </>
                )}

                {activeView === 'activities' && (
                  <>
                    <Panel title="Realizacija po menadžerima" subtitle="Završene i otvorene aktivnosti iz planova" className="lg:col-span-2">
                      {data.manager_performance.length === 0 ? (
                        <EmptyChart />
                      ) : (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.manager_performance} layout="vertical" margin={{ left: 8, right: 16 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <Tooltip content={<ChartTooltip />} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Bar dataKey="completed" name="Završeno" stackId="m" fill="#16a34a" animationDuration={1000} />
                              <Bar dataKey="open" name="Otvoreno" stackId="m" fill="#f59e0b" radius={[0, 8, 8, 0]} animationDuration={1000} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </Panel>

                    <Panel title="Planovi po tipu" subtitle="Obilasci i inventure">
                      <DonutChart data={data.plans_by_type} />
                    </Panel>

                    <Panel
                      title="Edukacije po tipu"
                      subtitle={`${kpis.educations_period} u periodu · ${kpis.educations_this_month} ovaj mjesec · ${kpis.educations_completed} završeno`}
                    >
                      <DonutChart data={data.education_by_type} />
                    </Panel>

                    <Panel title="Edukacije kroz vrijeme" subtitle="Planirane vs završene edukacije" className="lg:col-span-2">
                      {data.education_trend.every((e) => !e.planned && !e.completed) ? (
                        <div className="flex flex-col items-center py-12 text-center">
                          <GraduationCap className="mb-2 h-10 w-10 text-slate-300" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">Još nema edukacija u odabranom periodu.</p>
                        </div>
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.education_trend} barGap={4}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                              <Tooltip content={<ChartTooltip />} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Bar dataKey="planned" name="Planirano" fill="#0284c7" radius={[6, 6, 0, 0]} animationDuration={1000} />
                              <Bar dataKey="completed" name="Završeno" fill="#16a34a" radius={[6, 6, 0, 0]} animationDuration={1000} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </Panel>

                    <Panel title="Sažetak" subtitle="Ključni brojevi" className="lg:col-span-2">
                      <div className="flex flex-wrap items-center gap-4">
                        {[
                          { label: 'Aktivnosti ukupno', value: kpis.activities_total, icon: ClipboardList, bg: 'bg-sky-50 dark:bg-sky-950/40', color: 'text-sky-600' },
                          { label: 'Otvorene aktivnosti', value: kpis.activities_open, icon: Activity, bg: 'bg-amber-50 dark:bg-amber-950/40', color: 'text-amber-600' },
                          { label: 'Aktivnosti kasne', value: kpis.activities_overdue, icon: AlertTriangle, bg: 'bg-orange-50 dark:bg-orange-950/40', color: 'text-orange-600' },
                          { label: 'Inventure s manjkom', value: kpis.inventory_shortages, icon: Package, bg: 'bg-rose-50 dark:bg-rose-950/40', color: 'text-rose-600' },
                        ].map((s) => {
                          const Icon = s.icon;
                          return (
                            <div key={s.label} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${s.bg}`}>
                              <Icon className={`h-5 w-5 ${s.color}`} />
                              <div>
                                <p className="text-xs text-slate-500">{s.label}</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{formatNumber(s.value)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
