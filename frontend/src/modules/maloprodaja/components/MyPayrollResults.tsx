import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Banknote,
  CarFront,
  ChartLine,
  ChevronDown,
  HandCoins,
  Loader2,
  Medal,
  PiggyBank,
  Rocket,
  Sparkles,
  Store,
  Trophy,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  retailPayrollService,
  type PayrollPeriod,
  type PayrollStoreBreakdown,
  type PayrollWorkerResult,
} from '../../../services/retailPayrollService';

const km = (v: number | null | undefined) =>
  Number(v ?? 0).toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number | null | undefined, digits = 2) =>
  Number(v ?? 0).toLocaleString('bs-BA', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const periodKey = (p: { year: number; month: number }) => `${p.year}-${p.month}`;
const SHORT_MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec'];

const SEGMENTS = [
  { key: 'base_salary', label: 'Osnovna plata', bg: 'bg-teal-400', soft: 'bg-teal-50 text-teal-500 dark:bg-teal-900/30 dark:text-teal-300', icon: Banknote },
  { key: 'turnover_difference', label: 'Razlika prema prometu', bg: 'bg-sky-400', soft: 'bg-sky-50 text-sky-500 dark:bg-sky-900/30 dark:text-sky-300', icon: Rocket },
  { key: 'stimulation', label: 'Stimulacija za plan', bg: 'bg-amber-400', soft: 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-300', icon: Trophy },
  { key: 'transport', label: 'Prevoz', bg: 'bg-violet-300', soft: 'bg-violet-50 text-violet-500 dark:bg-violet-900/30 dark:text-violet-300', icon: CarFront },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]['key'];

/** Combines several result rows of one period (normally there is just one). */
function mergeResults(list: PayrollWorkerResult[]): PayrollWorkerResult | null {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  const [first, ...rest] = list;
  const totals = { ...first.totals };
  rest.forEach((r) => {
    (Object.keys(totals) as (keyof typeof totals)[]).forEach((k) => {
      totals[k] = Math.round((totals[k] + r.totals[k]) * 100) / 100;
    });
  });
  const stores = list.flatMap((r) => r.stores);
  return { ...first, totals, stores, stores_count: stores.length, warnings: list.flatMap((r) => r.warnings) };
}

export default function MyPayrollResults({ periods }: { periods: PayrollPeriod[] }) {
  const [all, setAll] = useState<PayrollWorkerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(periods[0] ? periodKey(periods[0]) : '');

  useEffect(() => {
    if (periods.length === 0) {
      setLoading(false);
      return;
    }
    retailPayrollService
      .getMy()
      .then((r) => setAll(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || 'Greška pri učitavanju vaših rezultata.'))
      .finally(() => setLoading(false));
  }, [periods.length]);

  const byPeriod = useMemo(() => {
    const map = new Map<string, PayrollWorkerResult[]>();
    all.forEach((r) => {
      const k = periodKey(r);
      map.set(k, [...(map.get(k) ?? []), r]);
    });
    return map;
  }, [all]);

  const chronological = useMemo(() => [...periods].reverse(), [periods]);
  const result = useMemo(() => mergeResults(byPeriod.get(period) ?? []), [byPeriod, period]);
  const previous = useMemo(() => {
    const idx = chronological.findIndex((p) => periodKey(p) === period);
    return idx > 0 ? mergeResults(byPeriod.get(periodKey(chronological[idx - 1])) ?? []) : null;
  }, [chronological, period, byPeriod]);

  if (periods.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-500 dark:bg-teal-900/30">
          <PiggyBank className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <p className="font-semibold text-gray-900 dark:text-white">Još nema vaših rezultata</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Rezultati će se pojaviti kada ovlaštena osoba učita obračun za mjesec.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-teal-500" /> Učitavanje...
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <PeriodPills periods={chronological} value={period} onChange={setPeriod} />

      {!result ? (
        <p className="py-12 text-center text-sm text-gray-500">Nema podataka za odabrani mjesec.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Hero result={result} previous={previous} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
              <KpiTiles result={result} />
            </div>
          </div>

          {chronological.length > 1 && <Trend periods={chronological} byPeriod={byPeriod} selected={period} onSelect={setPeriod} />}

          <section>
            <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <Store className="h-4 w-4 text-teal-500" />
              {result.stores.length > 1 ? `Prodavnice (${result.stores.length})` : 'Prodavnica'}
            </h3>
            <div className="space-y-2.5 sm:space-y-3">
              {result.stores.map((s) => (
                <StoreCard key={s.row_id} s={s} />
              ))}
            </div>
          </section>

          {result.warnings.length > 0 && <Warnings warnings={result.warnings} />}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PeriodPills({ periods, value, onChange }: { periods: PayrollPeriod[]; value: string; onChange: (k: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [value]);

  return (
    <div ref={ref} className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {periods.map((p) => {
        const k = periodKey(p);
        const active = k === value;
        return (
          <button
            key={k}
            type="button"
            data-active={active}
            onClick={() => onChange(k)}
            className={`shrink-0 snap-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95 ${
              active
                ? 'bg-teal-500 text-white shadow-sm shadow-teal-200 dark:shadow-none'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-teal-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
            }`}
          >
            {SHORT_MONTHS[p.month]}
            {p.year !== new Date().getFullYear() ? ` ${p.year}` : ''}
          </button>
        );
      })}
    </div>
  );
}

function Hero({ result, previous }: { result: PayrollWorkerResult; previous: PayrollWorkerResult | null }) {
  const t = result.totals;
  const diff = previous ? t.total_with_transport - previous.totals.total_with_transport : null;
  const planMet = result.stores.some((s) => s.plan_met);
  const parts = SEGMENTS.filter((s, i) => i === 0 || t[s.key as SegmentKey] > 0);
  const sum = parts.reduce((a, s) => a + Math.max(0, t[s.key as SegmentKey]), 0) || 1;

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-sky-50 p-4 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />

      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[13px] font-medium text-gray-500 dark:text-gray-400">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-teal-500 shadow-sm ring-1 ring-teal-100 dark:bg-gray-900 dark:ring-teal-800">
              <HandCoins className="h-4 w-4" />
            </span>
            Za isplatu · {result.month_label}
          </p>
          {planMet && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800">
              <Sparkles className="h-3 w-3" /> Plan
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="bg-gradient-to-r from-teal-600 to-sky-500 bg-clip-text text-[2rem] font-bold leading-none tracking-tight text-transparent tabular-nums sm:text-5xl">
            {km(t.total_with_transport)}
          </span>
          <span className="text-sm font-medium text-gray-400 sm:text-base">KM</span>
          {diff != null && Math.abs(diff) >= 0.01 && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                diff >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-300'
              }`}
            >
              {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {diff >= 0 ? '+' : ''}
              {km(diff)}
            </span>
          )}
        </div>

        <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/80 dark:bg-gray-700">
          {parts.map((s) => {
            const w = (Math.max(0, t[s.key as SegmentKey]) / sum) * 100;
            return w > 0 ? <div key={s.key} className={`${s.bg} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${w}%` }} /> : null;
          })}
        </div>

        <ul className="mt-3 space-y-1.5">
          {parts.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.key} className="flex items-center gap-2.5">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.soft}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-gray-600 dark:text-gray-300">
                  {i > 0 && <span className="mr-1 text-gray-400">+</span>}
                  {s.label}
                </span>
                <span className="text-[13px] font-semibold text-gray-900 tabular-nums dark:text-white">{km(t[s.key as SegmentKey])}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function KpiTiles({ result }: { result: PayrollWorkerResult }) {
  const t = result.totals;
  const lyChange = t.turnover_worker_ly > 0 ? ((t.turnover_worker_cy - t.turnover_worker_ly) / t.turnover_worker_ly) * 100 : null;
  const main = [...result.stores].sort((a, b) => b.working_days - a.working_days)[0];
  const achievement = main?.plan_achievement ?? null;

  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-500 dark:bg-sky-900/30 dark:text-sky-300">
            <ChartLine className="h-4 w-4" />
          </span>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Vaš promet</p>
        </div>
        <p className="mt-2 truncate text-lg font-bold text-gray-900 tabular-nums dark:text-white sm:text-2xl">{km(t.turnover_worker_cy)}</p>
        {lyChange != null && (
          <p className={`mt-0.5 text-[11px] font-medium ${lyChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {lyChange >= 0 ? '+' : ''}
            {num(lyChange, 1)} % od prošle god.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-300">
            <Medal className="h-4 w-4" />
          </span>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan prodavnice</p>
        </div>
        <p className="mt-2 text-lg font-bold text-gray-900 tabular-nums dark:text-white sm:text-2xl">{achievement != null ? `${num(achievement, 1)} %` : '—'}</p>
        {achievement != null && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-full rounded-full ${main?.plan_met ? 'bg-emerald-400' : 'bg-amber-300'}`}
              style={{ width: `${Math.min(100, achievement)}%` }}
            />
          </div>
        )}
      </div>
    </>
  );
}

function Trend({
  periods,
  byPeriod,
  selected,
  onSelect,
}: {
  periods: PayrollPeriod[];
  byPeriod: Map<string, PayrollWorkerResult[]>;
  selected: string;
  onSelect: (k: string) => void;
}) {
  const data = periods.slice(-6).map((p) => ({
    key: periodKey(p),
    p,
    total: mergeResults(byPeriod.get(periodKey(p)) ?? [])?.totals.total_with_transport ?? 0,
  }));
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 pb-3 pt-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Zadnji mjeseci</p>
      <div className="mt-2 flex h-20 items-end gap-2">
        {data.map((d) => {
          const active = d.key === selected;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelect(d.key)}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 active:scale-95"
              title={`${d.p.label}: ${km(d.total)} KM`}
            >
              <div
                className={`w-full max-w-[36px] rounded-lg transition-all duration-500 ${
                  active ? 'bg-gradient-to-t from-teal-400 to-cyan-300 shadow-sm shadow-teal-200 dark:shadow-none' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={{ height: `${Math.max((d.total / max) * 100, 6)}%` }}
              />
              <span className={`text-[11px] ${active ? 'font-semibold text-teal-600 dark:text-teal-300' : 'text-gray-400'}`}>{SHORT_MONTHS[d.p.month]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StoreCard({ s }: { s: PayrollStoreBreakdown }) {
  const [open, setOpen] = useState(false);
  const achievement = s.plan_achievement ?? 0;

  const details: [string, string][] = [
    [s.share < 1 ? `Osnovna plata (${num(s.share * 100, 0)} % od ${km(s.category_salary)})` : 'Osnovna plata', km(s.base_salary)],
    ['Koeficijent plate (KP)', `${num(s.kp * 100, 2)} %`],
    ['Plata prema prometu', km(s.turnover_salary)],
    ['Razlika prema prometu', km(s.turnover_difference)],
    ['Promet / plan prodavnice', `${num(s.turnover_store_cy, 0)} / ${num(s.plan_store, 0)}`],
    ['Vaše učešće u prometu', `${num(s.worker_share * 100, 1)} %`],
    ['Stimulacija', km(s.stimulation)],
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full p-3.5 text-left active:bg-gray-50 dark:active:bg-gray-700/40 sm:p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-500 dark:bg-teal-900/30 dark:text-teal-300">
            <Store className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-gray-900 dark:text-white">{s.store_name}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Kat. {s.category ?? '?'} · {num(s.working_days, 0)} dana
            </p>
          </div>
          <div className="text-right">
            <p className="whitespace-nowrap text-base font-bold text-gray-900 tabular-nums dark:text-white">{km(s.total)}</p>
            <p className="text-[11px] text-gray-400">KM</p>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-full rounded-full ${s.plan_met ? 'bg-emerald-400' : 'bg-amber-300'}`}
              style={{ width: `${Math.min(100, achievement)}%` }}
            />
          </div>
          <span className={`text-[11px] font-semibold tabular-nums ${s.plan_met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
            Plan {num(achievement, 0)} %
          </span>
        </div>
      </button>

      {open && (
        <dl className="divide-y divide-gray-50 border-t border-gray-100 bg-gray-50/50 px-3.5 dark:divide-gray-700/60 dark:border-gray-700 dark:bg-gray-900/30 sm:px-4">
          {details.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2 text-[13px]">
              <dt className="min-w-0 text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="shrink-0 font-medium text-gray-900 tabular-nums dark:text-gray-100">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
            <dt className="font-semibold text-gray-900 dark:text-white">Ukupno</dt>
            <dd className="font-bold text-teal-600 tabular-nums dark:text-teal-300">{km(s.total)} KM</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-amber-50/70 px-3.5 py-2.5 text-[12px] text-amber-800 dark:bg-amber-900/10 dark:text-amber-200">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left font-medium">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span className="flex-1">Napomene uz obračun ({warnings.length})</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-1.5 space-y-0.5 pl-5 text-amber-700/90 dark:text-amber-200/80">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
