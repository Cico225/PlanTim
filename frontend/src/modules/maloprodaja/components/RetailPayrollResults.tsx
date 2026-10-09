import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Award,
  Upload,
  Users,
  Tags,
  Link2,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
  ChevronRight,
  Store,
  TrendingUp,
  Target,
  Wallet,
  Bus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  Trash2,
  Save,
  User,
  Calculator,
} from 'lucide-react';
import {
  retailPayrollService,
  type PayrollMeta,
  type PayrollPeriod,
  type PayrollStoreBreakdown,
  type PayrollSummary,
  type PayrollUploadResult,
  type PayrollUserOption,
  type PayrollWorkerLink,
  type PayrollWorkerResult,
  type SalaryCategory,
} from '../../../services/retailPayrollService';
import MyPayrollResults from './MyPayrollResults';

type View = 'my' | 'summary' | 'upload' | 'categories' | 'links';

const km = (v: number | null | undefined) =>
  `${Number(v ?? 0).toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`;
const num = (v: number | null | undefined, digits = 2) =>
  Number(v ?? 0).toLocaleString('bs-BA', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (v: number | null | undefined, digits = 2) => `${num((v ?? 0) * 100, digits)} %`;

const periodKey = (p: { year: number; month: number }) => `${p.year}-${p.month}`;

const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

export default function RetailPayrollResults() {
  const [meta, setMeta] = useState<PayrollMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('my');

  const loadMeta = useCallback(async () => {
    try {
      const data = await retailPayrollService.getMeta();
      setMeta(data);
      return data;
    } catch (e) {
      toast.error(errorMessage(e, 'Greška pri učitavanju rezultata.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta().then((m) => {
      if (m?.can_manage && m.my_periods.length === 0) setView('summary');
    });
  }, [loadMeta]);

  const tabs: { key: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = meta?.can_manage
    ? [
        { key: 'my', label: 'Moji rezultati', icon: User },
        { key: 'summary', label: 'Pregled svih radnika', icon: Users },
        { key: 'upload', label: 'Uvoz Excel', icon: Upload },
        { key: 'categories', label: 'Kategorije plata', icon: Tags },
        { key: 'links', label: 'Povezivanje radnika', icon: Link2 },
      ]
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 px-1 pt-1 sm:px-0 sm:pt-0">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-500 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:ring-teal-800 sm:h-10 sm:w-10">
              <Award className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            Ostvareni rezultati
          </h2>
          <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400 sm:text-sm">
            Promet, ispunjenje plana i obračun primanja po prodavnicama.
          </p>
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 [scrollbar-width:none] dark:border-gray-700 dark:bg-gray-800 sm:flex-wrap sm:gap-2 [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = view === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setView(t.key)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition sm:px-4 sm:text-sm ${
                  active
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Učitavanje...
        </div>
      ) : !meta ? null : view === 'my' ? (
        <MyPayrollResults periods={meta.my_periods} />
      ) : view === 'summary' ? (
        <SummaryView periods={meta.periods} onChanged={loadMeta} onGoUpload={() => setView('upload')} />
      ) : view === 'upload' ? (
        <UploadView meta={meta} onUploaded={loadMeta} onGoLinks={() => setView('links')} onGoSummary={() => setView('summary')} />
      ) : view === 'categories' ? (
        <CategoriesView categories={meta.categories} onSaved={loadMeta} />
      ) : (
        <LinksView />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function PeriodSelect({
  periods,
  value,
  onChange,
}: {
  periods: PayrollPeriod[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
    >
      {periods.map((p) => (
        <option key={periodKey(p)} value={periodKey(p)}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

function EmptyState({ icon: Icon, title, text, action }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-600 dark:bg-gray-800">
      <Icon className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
      <p className="font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'slate' | 'blue' | 'amber' | 'teal' | 'violet';
  highlight?: boolean;
}) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    teal: 'bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  };
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? 'border-teal-500 bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? 'text-teal-50' : 'text-gray-500 dark:text-gray-400'}`}>{label}</p>
        <span className={`rounded-lg p-1.5 ${highlight ? 'bg-white/20 text-white' : tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 text-xl font-bold ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${highlight ? 'text-teal-50' : 'text-gray-500 dark:text-gray-400'}`}>{hint}</p>}
    </div>
  );
}

function StoreBreakdownCard({ s, showStoreData = true }: { s: PayrollStoreBreakdown; showStoreData?: boolean }) {
  const kpSourceLabel =
    s.kp_source === 'worker'
      ? 'Neto plata LY (radnik) / Bruto promet LY (radnik)'
      : s.kp_source === 'store'
        ? 'Nema LY podataka radnika - uzet KP prodavnice (Neto plata LY prodavnice / Bruto promet LY prodavnice)'
        : 'Nema LY podataka - KP nije moguće izračunati';
  const shareLabel =
    s.share_basis === 'days'
      ? `${num(s.working_days, 0)} radnih dana (${pct(s.share)} mjeseca)`
      : s.share_basis === 'turnover'
        ? `${pct(s.share)} prema prometu`
        : `${pct(s.share)} (jednako)`;

  const Line = ({ label, formula, value, strong, tone }: { label: string; formula?: string; value: string; strong?: boolean; tone?: string }) => (
    <div className={`flex items-start justify-between gap-4 py-2 ${strong ? 'font-semibold' : ''}`}>
      <div className="min-w-0">
        <p className={`text-sm ${strong ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>{label}</p>
        {formula && <p className="text-xs text-gray-500 dark:text-gray-400">{formula}</p>}
      </div>
      <p className={`shrink-0 text-sm tabular-nums ${tone ?? (strong ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100')}`}>{value}</p>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-teal-100 p-2 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            <Store className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{s.store_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {s.category_label ?? `${s.position ?? 'Prodavač'} - kategorija ${s.category ?? '?'}`} · {shareLabel}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Ukupno za prodavnicu</p>
          <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{km(s.total)}</p>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-700 lg:border-b-0 lg:border-r">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            <Wallet className="h-3.5 w-3.5" /> Plata
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            <Line
              label="Osnovna plata iz kategorije"
              formula={s.share < 1 ? `${km(s.category_salary)} × ${pct(s.share)}` : undefined}
              value={km(s.base_salary)}
            />
            <Line label="Koeficijent plate (KP)" formula={kpSourceLabel} value={`${num(s.kp * 100, 3)} %`} />
            <Line label="Plata prema prometu" formula={`KP × bruto promet CY (${km(s.turnover_worker_cy)})`} value={km(s.turnover_salary)} />
            <Line
              label="Dio razlike prema prometu"
              formula="Plata prema prometu − osnovna plata (ako je pozitivno)"
              value={km(s.turnover_difference)}
              tone={s.turnover_difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : undefined}
            />
            <Line label="Plata" formula="Osnovna plata + dio razlike prema prometu" value={km(s.salary)} strong />
          </div>
        </div>

        <div className="px-5 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            <Target className="h-3.5 w-3.5" /> Stimulacija za ispunjen plan
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {showStoreData && (
              <>
                <Line label="Bruto plan prodavnice" value={km(s.plan_store)} />
                <Line
                  label="Bruto promet prodavnice CY"
                  formula={s.plan_achievement != null ? `Ostvarenje plana: ${num(s.plan_achievement)} %` : undefined}
                  value={km(s.turnover_store_cy)}
                />
              </>
            )}
            <div className="py-2">
              {s.plan_met ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Plan prodavnice ispunjen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  <XCircle className="h-3.5 w-3.5" /> Plan prodavnice nije ispunjen
                </span>
              )}
            </div>
            <Line label="Osnova za stimulaciju" formula="Promet prodavnice CY − plan prodavnice" value={km(s.stimulation_base)} />
            <Line
              label="Učešće radnika u prometu prodavnice"
              formula={`${km(s.turnover_worker_cy)} / ${km(s.turnover_store_cy)}`}
              value={pct(s.worker_share)}
            />
            <Line
              label="Stimulacija"
              formula="Osnova × KP × učešće radnika"
              value={km(s.stimulation)}
              strong
              tone={s.stimulation > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-2.5 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
        <span>
          Promet LY: <b className="tabular-nums">{km(s.turnover_worker_ly)}</b> · Promet CY: <b className="tabular-nums">{km(s.turnover_worker_cy)}</b>
          {s.plan_worker_cy > 0 && (
            <>
              {' '}· Plan radnika CY: <b className="tabular-nums">{km(s.plan_worker_cy)}</b>
            </>
          )}
        </span>
        <span>
          Plata {km(s.salary)} + stimulacija {km(s.stimulation)} = <b className="text-gray-900 dark:text-white">{km(s.total)}</b>
          {s.transport > 0 && <> · Prevoz {km(s.transport)}</>}
        </span>
      </div>
    </div>
  );
}

function WorkerResultDetail({ result }: { result: PayrollWorkerResult }) {
  const t = result.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Osnovna plata" value={km(t.base_salary)} hint="Iz kategorije" icon={Wallet} tone="slate" />
        <SummaryCard label="Razlika prema prometu" value={km(t.turnover_difference)} hint={`Plata prema prometu: ${km(t.turnover_salary)}`} icon={TrendingUp} tone="blue" />
        <SummaryCard label="Stimulacija za plan" value={km(t.stimulation)} icon={Target} tone="amber" />
        <SummaryCard label="Prevoz" value={km(t.transport)} icon={Bus} tone="violet" />
        <SummaryCard label="Ukupna plata" value={km(t.total)} hint="Osnovna + razlika + stimulacija" icon={Calculator} tone="teal" />
        <SummaryCard label="Ukupno sa prevozom" value={km(t.total_with_transport)} hint={`${result.stores_count} ${result.stores_count === 1 ? 'prodavnica' : 'prodavnice'} · ${num(t.working_days, 0)} dana`} icon={Award} tone="teal" highlight />
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Napomene uz obračun
          </p>
          <ul className="list-disc space-y-0.5 pl-6">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {result.stores.map((s) => (
        <StoreBreakdownCard key={s.row_id} s={s} />
      ))}

      {result.stores.length > 1 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Prodavnica</th>
                <th className="px-4 py-2 text-right">Osnovna</th>
                <th className="px-4 py-2 text-right">Razlika</th>
                <th className="px-4 py-2 text-right">Stimulacija</th>
                <th className="px-4 py-2 text-right">Ukupno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {result.stores.map((s) => (
                <tr key={s.row_id} className="text-gray-800 dark:text-gray-100">
                  <td className="px-4 py-2">{s.store_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{km(s.base_salary)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{km(s.turnover_difference)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{km(s.stimulation)}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{km(s.total)}</td>
                </tr>
              ))}
              <tr className="bg-teal-50 font-bold text-teal-800 dark:bg-teal-900/20 dark:text-teal-200">
                <td className="px-4 py-2">Ukupno</td>
                <td className="px-4 py-2 text-right tabular-nums">{km(t.base_salary)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{km(t.turnover_difference)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{km(t.stimulation)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{km(t.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Manager summary                                                     */
/* ------------------------------------------------------------------ */

function SummaryView({ periods, onChanged, onGoUpload }: { periods: PayrollPeriod[]; onChanged: () => void; onGoUpload: () => void }) {
  const [period, setPeriod] = useState(periods[0] ? periodKey(periods[0]) : '');
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (periods.length && !periods.some((p) => periodKey(p) === period)) setPeriod(periodKey(periods[0]));
  }, [periods, period]);

  const load = useCallback(() => {
    if (!period) return;
    const [year, month] = period.split('-').map(Number);
    setLoading(true);
    retailPayrollService
      .getSummary(year, month)
      .then(setSummary)
      .catch((e) => toast.error(errorMessage(e, 'Greška pri učitavanju pregleda.')))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!summary) return [];
    if (!q) return summary.data;
    return summary.data.filter(
      (w) => w.worker_name.toLowerCase().includes(q) || w.stores.some((s) => s.store_name.toLowerCase().includes(q)) || (w.user_name ?? '').toLowerCase().includes(q),
    );
  }, [summary, search]);

  const exportCsv = () => {
    if (!summary) return;
    const header = ['Radnik', 'Korisnik', 'Prodavnica', 'Kategorija', 'Radni dani', 'Promet LY', 'Promet CY', 'KP %', 'Osnovna plata', 'Plata prema prometu', 'Razlika prema prometu', 'Plata', 'Plan prodavnice', 'Promet prodavnice CY', 'Osnova stimulacije', 'Učešće %', 'Stimulacija', 'Ukupno', 'Prevoz'];
    const lines = [header.join(';')];
    const f = (v: number) => num(v).replace(/\./g, '');
    summary.data.forEach((w) =>
      w.stores.forEach((s) =>
        lines.push(
          [w.worker_name, w.user_name ?? '', s.store_name, s.category ?? '', num(s.working_days, 0), f(s.turnover_worker_ly), f(s.turnover_worker_cy), num(s.kp * 100, 3), f(s.base_salary), f(s.turnover_salary), f(s.turnover_difference), f(s.salary), f(s.plan_store), f(s.turnover_store_cy), f(s.stimulation_base), num(s.worker_share * 100), f(s.stimulation), f(s.total), f(s.transport)]
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(';'),
        ),
      ),
    );
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `obracun-plata-${period}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const removePeriod = async () => {
    const p = periods.find((x) => periodKey(x) === period);
    if (!p || !window.confirm(`Obrisati sve učitane rezultate za ${p.label}?`)) return;
    try {
      await retailPayrollService.deletePeriod(p.year, p.month);
      toast.success('Period je obrisan.');
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e, 'Brisanje nije uspjelo.'));
    }
  };

  if (periods.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Nema učitanih rezultata"
        text="Učitajte Excel sa prometima i rezultatima radnika da bi se izvršio obračun plata."
        action={
          <button type="button" onClick={onGoUpload} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
            <Upload className="h-4 w-4" /> Uvoz Excel
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelect periods={periods} value={period} onChange={setPeriod} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraga radnika ili prodavnice..."
              className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
            <Download className="h-4 w-4" /> Izvoz CSV
          </button>
          <button type="button" onClick={removePeriod} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" /> Obriši period
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryCard label="Radnika" value={String(summary.workers_count)} hint={summary.unlinked_count ? `${summary.unlinked_count} nije povezano s korisnikom` : 'Svi povezani s korisnicima'} icon={Users} tone="slate" />
          <SummaryCard label="Osnovne plate" value={km(summary.totals.base_salary)} icon={Wallet} tone="slate" />
          <SummaryCard label="Razlike prema prometu" value={km(summary.totals.turnover_difference)} icon={TrendingUp} tone="blue" />
          <SummaryCard label="Stimulacije" value={km(summary.totals.stimulation)} icon={Target} tone="amber" />
          <SummaryCard label="Prevoz" value={km(summary.totals.transport)} icon={Bus} tone="violet" />
          <SummaryCard label="Ukupno plate" value={km(summary.totals.total)} hint={`Sa prevozom: ${km(summary.totals.total_with_transport)}`} icon={Calculator} tone="teal" highlight />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Učitavanje...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3 text-left">Radnik</th>
                  <th className="px-3 py-3 text-left">Prodavnice</th>
                  <th className="px-3 py-3 text-right">Promet CY</th>
                  <th className="px-3 py-3 text-right">Osnovna</th>
                  <th className="px-3 py-3 text-right">Razlika</th>
                  <th className="px-3 py-3 text-right">Stimulacija</th>
                  <th className="px-3 py-3 text-right">Ukupno</th>
                  <th className="px-3 py-3 text-right">Prevoz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((w) => {
                  const open = expanded === w.worker_key;
                  return (
                    <React.Fragment key={w.worker_key}>
                      <tr
                        onClick={() => setExpanded(open ? null : w.worker_key)}
                        className={`cursor-pointer text-gray-800 transition hover:bg-teal-50/60 dark:text-gray-100 dark:hover:bg-teal-900/10 ${open ? 'bg-teal-50/60 dark:bg-teal-900/10' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-gray-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{w.worker_name}</p>
                          <p className="text-xs">
                            {w.user_name ? (
                              <span className="text-gray-500 dark:text-gray-400">{w.user_name}</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">Nije povezan s korisnikom</span>
                            )}
                            {w.warnings.length > 0 && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400" title={w.warnings.join('\n')}>
                                <AlertTriangle className="h-3 w-3" /> {w.warnings.length}
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{w.stores.map((s) => s.store_name).join(', ')}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{km(w.totals.turnover_worker_cy)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{km(w.totals.base_salary)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-blue-700 dark:text-blue-300">{km(w.totals.turnover_difference)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-300">{km(w.totals.stimulation)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{km(w.totals.total)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{km(w.totals.transport)}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={9} className="bg-gray-50 px-4 py-4 dark:bg-gray-900/40">
                            <WorkerResultDetail result={w} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                      Nema rezultata za zadanu pretragu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

function UploadView({ meta, onUploaded, onGoLinks, onGoSummary }: { meta: PayrollMeta; onUploaded: () => void; onGoLinks: () => void; onGoSummary: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<PayrollUploadResult | null>(null);
  const [failure, setFailure] = useState<{ message: string; errors: any[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      toast.error('Odaberite Excel fajl (.xlsx, .xls ili .csv).');
      return;
    }
    setFile(f);
    setResult(null);
    setFailure(null);
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setFailure(null);
    try {
      const res = await retailPayrollService.upload(file, year, setProgress);
      setResult(res);
      setFile(null);
      toast.success(res.message);
      onUploaded();
    } catch (e: any) {
      setFailure({ message: errorMessage(e, 'Uvoz nije uspio.'), errors: e?.response?.data?.errors && Array.isArray(e.response.data.errors) ? e.response.data.errors : [] });
    } finally {
      setUploading(false);
    }
  };

  const last = meta.last_import;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">Godina obračuna</span>
              <input
                type="number"
                value={year}
                min={2000}
                max={2100}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>
            <p className="pb-2 text-xs text-gray-500 dark:text-gray-400">Mjeseci se čitaju iz kolone „Mjesec”. Ponovni uvoz zamjenjuje podatke za iste mjesece.</p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragOver ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/40'
            }`}
          >
            <FileSpreadsheet className={`mb-3 h-12 w-12 ${file ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`} />
            {file ? (
              <>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · kliknite za drugi fajl</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700 dark:text-gray-200">Prevucite Excel fajl ovdje ili kliknite za odabir</p>
                <p className="text-xs text-gray-500">.xlsx, .xls ili .csv, do 20 MB</p>
              </>
            )}
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </div>

          {uploading && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div className="h-full bg-teal-500 transition-all" style={{ width: `${Math.max(progress, 5)}%` }} />
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!file || uploading}
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? (progress < 100 ? `Slanje ${progress}%` : 'Obrada...') : 'Učitaj i obračunaj'}
            </button>
          </div>
        </div>

        {failure && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p className="flex items-center gap-2 font-semibold">
              <XCircle className="h-4 w-4" /> {failure.message}
            </p>
            {failure.errors.length > 0 && (
              <ul className="mt-2 max-h-60 list-disc space-y-0.5 overflow-auto pl-6">
                {failure.errors.map((er: any, i: number) => (
                  <li key={i}>{er.row ? `Red ${er.row}: ` : ''}{er.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-emerald-200 bg-white p-5 dark:border-emerald-800 dark:bg-gray-800">
            <p className="flex items-center gap-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" /> {result.message}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Period: {result.months.map((m) => m.label).join(', ')} {result.year}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniStat label="Redova" value={result.rows_count} />
              <MiniStat label="Radnika" value={result.workers_count} />
              <MiniStat label="Prodavnica" value={result.stores_count} />
              <MiniStat label="Nepovezanih radnika" value={result.unlinked_count} warn={result.unlinked_count > 0} />
            </div>
            {result.unlinked_count > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <span>
                  {result.unlinked_count} radnika nije povezano s korisničkim nalogom - oni još ne vide svoje rezultate.
                </span>
                <button type="button" onClick={onGoLinks} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
                  <Link2 className="h-3.5 w-3.5" /> Poveži radnike
                </button>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" /> Upozorenja i preskočeni redovi ({result.errors.length})
                </p>
                <ul className="max-h-60 space-y-1 overflow-auto rounded-lg border border-gray-100 p-2 text-xs dark:border-gray-700">
                  {result.errors.map((er, i) => (
                    <li key={i} className={er.level === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'}>
                      {er.row ? `Red ${er.row}` : ''}
                      {er.worker ? ` (${er.worker})` : ''}: {er.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={onGoSummary} className="inline-flex items-center gap-2 rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-900/20">
                <Users className="h-4 w-4" /> Pregled obračuna
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <Calculator className="h-4 w-4 text-teal-600" /> Način obračuna
          </p>
          <ol className="list-decimal space-y-1.5 pl-5 text-gray-600 dark:text-gray-300">
            <li>Osnovna plata prema poziciji i kategoriji (A/B/C). Ako je radnik radio u više prodavnica, dijeli se prema radnim danima.</li>
            <li>KP = Neto plata LY (radnik) / Bruto promet radnika LY.</li>
            <li>Plata prema prometu = KP × Bruto promet radnika CY. Dio razlike prema prometu = iznos iznad osnovne plate.</li>
            <li>Ako je promet prodavnice CY ≥ plan prodavnice: stimulacija = (promet − plan) × KP × učešće radnika u prometu prodavnice.</li>
            <li>Plata po prodavnicama se sabira u ukupnu platu. Prevoz se prikazuje zasebno.</li>
          </ol>
        </div>
        {last && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-2 font-semibold text-gray-900 dark:text-white">Posljednji uvoz</p>
            <p className="text-gray-700 dark:text-gray-200">{last.file_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(last.created_at).toLocaleString('bs-BA')} · {last.rows_count} redova
              {last.uploaded_by_name ? ` · ${last.uploaded_by_name}` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${warn ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-900/40'}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${warn ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

function CategoriesView({ categories, onSaved }: { categories: SalaryCategory[]; onSaved: () => void }) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(Object.fromEntries(categories.map((c) => [c.id, String(Number(c.base_salary).toFixed(2))])));
  }, [categories]);

  const dirty = categories.some((c) => Number(values[c.id]?.replace(',', '.')) !== Number(c.base_salary));

  const save = async () => {
    const payload = categories.map((c) => ({ id: c.id, base_salary: Number((values[c.id] ?? '0').replace(',', '.')) }));
    if (payload.some((p) => Number.isNaN(p.base_salary) || p.base_salary < 0)) {
      toast.error('Unesite ispravne iznose.');
      return;
    }
    setSaving(true);
    try {
      const res = await retailPayrollService.updateCategories(payload);
      toast.success(res.message);
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e, 'Spremanje nije uspjelo.'));
    } finally {
      setSaving(false);
    }
  };

  const groups: { type: 'seller' | 'manager'; title: string }[] = [
    { type: 'seller', title: 'Prodavači' },
    { type: 'manager', title: 'Šefovi prodavnica' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.type} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <p className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              {g.type === 'seller' ? <User className="h-4 w-4 text-teal-600" /> : <Award className="h-4 w-4 text-amber-500" />}
              {g.title}
            </p>
            <div className="space-y-2">
              {categories
                .filter((c) => c.position_type === g.type)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${g.type === 'seller' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                      {c.category}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{c.label}</span>
                    <div className="relative">
                      <input
                        value={values[c.id] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
                        inputMode="decimal"
                        className="w-32 rounded-lg border border-gray-300 bg-white py-1.5 pl-3 pr-10 text-right text-sm font-semibold tabular-nums dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">KM</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">Pozicija iz Excela koja sadrži „Šef” ili „Poslovođa” koristi kategorije šefova, ostale kategorije prodavača. Izmjena se odmah primjenjuje na sve obračune.</p>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Spremi kategorije
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Worker <-> user links                                               */
/* ------------------------------------------------------------------ */

function LinksView() {
  const [links, setLinks] = useState<PayrollWorkerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    retailPayrollService
      .getWorkerLinks()
      .then((r) => setLinks(r.data))
      .catch((e) => toast.error(errorMessage(e, 'Greška pri učitavanju radnika.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const save = async (link: PayrollWorkerLink, user: PayrollUserOption | null) => {
    try {
      await retailPayrollService.updateWorkerLink(link.id, user?.id ?? null);
      setLinks((ls) => ls.map((l) => (l.id === link.id ? { ...l, user_id: user?.id ?? null, user_name: user?.name ?? null, user_email: user?.email ?? null } : l)));
      toast.success(user ? `${link.worker_name} → ${user.name}` : 'Veza uklonjena.');
    } catch (e) {
      toast.error(errorMessage(e, 'Spremanje nije uspjelo.'));
    }
  };

  const filtered = links.filter((l) => {
    if (onlyUnlinked && l.user_id) return false;
    const q = search.trim().toLowerCase();
    return !q || l.worker_name.toLowerCase().includes(q) || (l.user_name ?? '').toLowerCase().includes(q) || l.stores.toLowerCase().includes(q);
  });
  const unlinked = links.filter((l) => !l.user_id).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        Povežite ime radnika iz Excela s njegovim korisničkim nalogom. Radnik vidi samo rezultate povezane s njegovim nalogom. Veza se pamti i za sve buduće uvoze.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraga..."
              className="w-64 rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} className="rounded border-gray-300 text-teal-600" />
            Samo nepovezani ({unlinked})
          </label>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Povezano {links.length - unlinked} od {links.length}
        </p>
      </div>

      <div className="overflow-visible rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Učitavanje...
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-500">Nema radnika za prikaz.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <div className="min-w-[220px] flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{l.worker_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{l.stores || 'Nema redova'}</p>
                </div>
                <UserPicker link={l} onSelect={(u) => save(l, u)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UserPicker({ link, onSelect }: { link: PayrollWorkerLink; onSelect: (u: PayrollUserOption | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<PayrollUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setLoading(true);
      retailPayrollService
        .searchUsers(query)
        .then((r) => setOptions(r.data))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const begin = () => {
    setQuery(link.worker_name.split(' ')[0] ?? '');
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {link.user_id ? (
        <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            {link.user_name}
            {link.user_email && <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">({link.user_email})</span>}
          </span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" /> Nije povezan
        </span>
      )}
      <button type="button" onClick={begin} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
        {link.user_id ? 'Promijeni' : 'Poveži'}
      </button>
      {link.user_id && (
        <button type="button" onClick={() => onSelect(null)} title="Ukloni vezu" className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
          <XCircle className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ime ili email korisnika..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-auto">
            {loading ? (
              <p className="flex items-center justify-center py-4 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traženje...
              </p>
            ) : options.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">Nema korisnika.</p>
            ) : (
              options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSelect(o);
                  }}
                  className={`flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-teal-900/20 ${o.id === link.user_id ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{o.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{o.email}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
