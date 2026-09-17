import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Users,
  UserPlus,
  UserMinus,
  Building2,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  Sparkles,
  Activity,
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
  LineChart,
  Line,
} from 'recharts';
import { getReportsOverview } from '../../../services/hrmService';

const MONTH_OPTIONS = [
  { value: 6, label: '6 mjeseci' },
  { value: 12, label: '12 mjeseci' },
  { value: 24, label: '24 mjeseca' },
];

const PIE_FALLBACK = ['#0d9488', '#0284c7', '#6366f1', '#f59e0b', '#ea580c', '#64748b', '#14b8a6', '#38bdf8'];

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

function formatNumber(n: number) {
  return new Intl.NumberFormat('bs-BA').format(n ?? 0);
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-slate-600 dark:bg-slate-800/95">
      {label && <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
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
  delay = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Users;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24, delay }}
      className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 p-4 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-800/70"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
        style={{ background: accent, opacity: 0.2 }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
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

export default function HRReports() {
  const [months, setMonths] = useState(12);
  const [activeView, setActiveView] = useState<'overview' | 'structure' | 'movement'>('overview');

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['hrm-reports-overview', months],
    queryFn: () => getReportsOverview({ months }),
  });

  const kpis = data?.kpis;
  const turnoverRate = useMemo(() => {
    if (!kpis?.active_employees) return 0;
    const exits = (data?.hires_vs_exits ?? []).reduce((s, r) => s + r.exits, 0);
    return Math.round((exits / Math.max(kpis.active_employees, 1)) * 1000) / 10;
  }, [data, kpis]);

  const views = [
    { key: 'overview' as const, label: 'Pregled', icon: Activity },
    { key: 'structure' as const, label: 'Struktura', icon: Building2 },
    { key: 'movement' as const, label: 'Kretanje', icon: TrendingUp },
  ];

  return (
    <div className="relative space-y-6 overflow-hidden">
      {/* Atmosphere — CSS only (avoids Firefox opacity parse spam from motion loops) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="hrm-report-blob absolute -left-20 -top-24 h-72 w-72 rounded-full bg-teal-400/25 blur-3xl dark:bg-teal-500/15" />
        <div className="hrm-report-blob-slow absolute -right-16 top-10 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/10" />
        <div className="hrm-report-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
      </div>
      <style>{`
        @keyframes hrm-report-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(24px, -16px); }
        }
        @keyframes hrm-report-drift-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 18px); }
        }
        .hrm-report-blob { animation: hrm-report-drift 14s ease-in-out infinite; }
        .hrm-report-blob-slow { animation: hrm-report-drift-slow 18s ease-in-out infinite; }
      `}</style>

      {/* Hero */}
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
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Živa HR analitika
            </div>
            <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
              <BarChart3 className="h-8 w-8 text-teal-100" />
              Izvještaji
            </h2>
            <p className="mt-2 max-w-xl text-sm text-teal-50/90 sm:text-base">
              Headcount, fluktuacija i struktura tima — grafički pregled u realnom vremenu.
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
      ) : error || !data ? (
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
              label="Ukupno zaposlenih"
              value={formatNumber(kpis?.total_employees ?? 0)}
              hint={`${formatNumber(kpis?.active_employees ?? 0)} aktivnih`}
              icon={Users}
              accent="#0d9488"
            />
            <KpiCard
              label="Novi ovaj mjesec"
              value={formatNumber(kpis?.new_hires_this_month ?? 0)}
              hint="Prijemi u tekućem mjesecu"
              icon={UserPlus}
              accent="#0284c7"
            />
            <KpiCard
              label="Odlasci ovaj mjesec"
              value={formatNumber(kpis?.terminations_this_month ?? 0)}
              hint={`Turnover (period): ${turnoverRate}%`}
              icon={UserMinus}
              accent="#ea580c"
            />
            <KpiCard
              label="Prosječni staž"
              value={`${kpis?.avg_tenure_months ?? 0} mj`}
              hint={`${kpis?.onboarding_in_progress ?? 0} onboarding · ${kpis?.offboarding_in_progress ?? 0} offboarding`}
              icon={Clock}
              accent="#0891b2"
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
                    title="Trend headcounta"
                    subtitle={`Procjena broja zaposlenih u zadnjih ${months} mjeseci`}
                    className="lg:col-span-2"
                  >
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.headcount_trend}>
                          <defs>
                            <linearGradient id="hcFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="Zaposleni"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            fill="url(#hcFill)"
                            animationDuration={1200}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel title="Status zaposlenih" subtitle="Raspodjela po HR statusu">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.by_status}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={88}
                            paddingAngle={3}
                            animationDuration={900}
                          >
                            {data.by_status.map((entry, i) => (
                              <Cell key={entry.key} fill={entry.color || PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel title="Prijemi vs odlasci" subtitle="Mjesečno kretanje">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.hires_vs_exits} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="hires" name="Prijemi" fill="#0284c7" radius={[6, 6, 0, 0]} animationDuration={1000} />
                          <Bar dataKey="exits" name="Odlasci" fill="#ea580c" radius={[6, 6, 0, 0]} animationDuration={1000} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                </>
              )}

              {activeView === 'structure' && (
                <>
                  <Panel title="Po odjelima" subtitle="Headcount po organizacijskim jedinicama" className="lg:col-span-2">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.by_department} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={120}
                            tick={{ fontSize: 11, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="value" name="Zaposleni" fill="#0d9488" radius={[0, 8, 8, 0]} animationDuration={1100} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel title="Po pozicijama" subtitle="Top 10 radnih mjesta">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.by_position}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={70}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} width={32} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="value" name="Broj" fill="#0284c7" radius={[8, 8, 0, 0]} animationDuration={1000} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel title="Tip zaposlenja / spol" subtitle="Struktura ugovora i demografija">
                    <div className="grid h-72 grid-cols-1 gap-2 sm:grid-cols-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.by_employment_type.length ? data.by_employment_type : [{ name: 'N/A', value: 1 }]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            animationDuration={900}
                          >
                            {(data.by_employment_type.length ? data.by_employment_type : [{ name: 'N/A', value: 1 }]).map(
                              (_, i) => (
                                <Cell key={i} fill={PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                              )
                            )}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.by_gender.length ? data.by_gender : [{ name: 'Nema podataka', value: 1 }]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            animationDuration={900}
                          >
                            {(data.by_gender.length ? data.by_gender : [{ name: 'Nema podataka', value: 1 }]).map((_, i) => (
                              <Cell key={i} fill={PIE_FALLBACK[(i + 2) % PIE_FALLBACK.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>
                </>
              )}

              {activeView === 'movement' && (
                <>
                  <Panel title="Fluktuacija — linija" subtitle="Prijemi i odlasci kroz period" className="lg:col-span-2">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.hires_vs_exits}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} width={32} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="hires"
                            name="Prijemi"
                            stroke="#0284c7"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                            animationDuration={1100}
                          />
                          <Line
                            type="monotone"
                            dataKey="exits"
                            name="Odlasci"
                            stroke="#ea580c"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                            animationDuration={1100}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  <Panel title="Procesi u toku" subtitle="Onboarding i offboarding">
                    <div className="space-y-4 py-2">
                      {[
                        {
                          label: 'Onboarding',
                          value: kpis?.onboarding_in_progress ?? 0,
                          icon: UserPlus,
                          color: '#6366f1',
                        },
                        {
                          label: 'Offboarding',
                          value: kpis?.offboarding_in_progress ?? 0,
                          icon: UserMinus,
                          color: '#ea580c',
                        },
                        {
                          label: 'Odjeli',
                          value: kpis?.departments_count ?? 0,
                          icon: Building2,
                          color: '#0d9488',
                        },
                      ].map((row, idx) => {
                        const Icon = row.icon;
                        const max = Math.max(kpis?.total_employees ?? 1, row.value, 1);
                        return (
                          <motion.div
                            key={row.label}
                            initial={{ x: -12 }}
                            animate={{ x: 0 }}
                            transition={{ delay: 0.1 * idx }}
                          >
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="inline-flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                                <Icon className="h-4 w-4" style={{ color: row.color }} />
                                {row.label}
                              </span>
                              <span className="font-bold tabular-nums text-slate-900 dark:text-white">{row.value}</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: row.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (row.value / max) * 100 * 4)}%` }}
                                transition={{ duration: 0.9, delay: 0.15 * idx, ease: 'easeOut' }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </Panel>

                  <Panel title="Razlozi odlaska" subtitle="Iz offboarding procesa">
                    {data.offboarding_reasons.length === 0 ? (
                      <p className="py-10 text-center text-sm text-slate-500">Još nema dovoljno podataka o odlascima.</p>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.offboarding_reasons}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={85}
                              animationDuration={900}
                            >
                              {data.offboarding_reasons.map((_, i) => (
                                <Cell key={i} fill={PIE_FALLBACK[i % PIE_FALLBACK.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </Panel>

                  <Panel title="Neto kretanje" subtitle="Prijemi minus odlasci" className="lg:col-span-2">
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3 dark:bg-sky-950/40">
                        <TrendingUp className="h-5 w-5 text-sky-600" />
                        <div>
                          <p className="text-xs text-slate-500">Ukupno prijema</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {formatNumber(data.hires_vs_exits.reduce((s, r) => s + r.hires, 0))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl bg-orange-50 px-4 py-3 dark:bg-orange-950/40">
                        <TrendingDown className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="text-xs text-slate-500">Ukupno odlazaka</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {formatNumber(data.hires_vs_exits.reduce((s, r) => s + r.exits, 0))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl bg-teal-50 px-4 py-3 dark:bg-teal-950/40">
                        <Activity className="h-5 w-5 text-teal-600" />
                        <div>
                          <p className="text-xs text-slate-500">Neto</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">
                            {formatNumber(
                              data.hires_vs_exits.reduce((s, r) => s + r.hires, 0) -
                                data.hires_vs_exits.reduce((s, r) => s + r.exits, 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
