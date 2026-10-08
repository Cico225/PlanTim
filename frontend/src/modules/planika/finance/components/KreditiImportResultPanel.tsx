import { useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiPlusCircle,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import type { KreditiImportError, KreditiImportedRow, KreditiUploadResult } from '@/types/planika-finance';

const PAGE_SIZE = 200;

const ERROR_TYPES: Record<NonNullable<KreditiImportError['type']>, { label: string; className: string }> = {
  missing_data: {
    label: 'Nedostaje datum/iznos',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  duplicate: {
    label: 'Duplikat',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  },
  empty_number: {
    label: 'Prazan broj',
    className: 'bg-gray-200 text-gray-800 dark:bg-dark-600 dark:text-gray-200',
  },
  other: {
    label: 'Ostalo',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  },
};

const ACTION_LABELS: Record<KreditiImportedRow['action'], { label: string; className: string }> = {
  created: {
    label: 'Novi',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  updated: {
    label: 'Ažuriran',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  },
  updated_verified: {
    label: 'Ažuriran (uparen)',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  },
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
};

const formatAmount = (value: number | null | undefined) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));

function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(escape).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  result: KreditiUploadResult;
  onClose: () => void;
}

export default function KreditiImportResultPanel({ result, onClose }: Props) {
  const rows = result.rows ?? [];
  const errors = result.errors ?? [];
  const [tab, setTab] = useState<'errors' | 'rows'>(errors.length > 0 ? 'errors' : 'rows');
  const [search, setSearch] = useState('');
  const [errorType, setErrorType] = useState<KreditiImportError['type'] | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<KreditiImportedRow['action'] | 'all'>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const totalRows = result.success_count + result.error_count;
  const successRate = totalRows > 0 ? Math.round((result.success_count / totalRows) * 100) : 0;
  const createdCount = result.created_count ?? rows.filter((r) => r.action === 'created').length;
  const updatedCount = result.updated_count ?? rows.length - createdCount;
  const totalAmount = result.total_amount ?? rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const periodLabel =
    result.import_month && result.import_year
      ? `${String(result.import_month).padStart(2, '0')}/${result.import_year}`
      : null;

  const errorTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    errors.forEach((e) => {
      const t = e.type ?? 'other';
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return counts;
  }, [errors]);

  const q = search.trim().toLowerCase();

  const filteredErrors = useMemo(
    () =>
      errors.filter((e) => {
        if (errorType !== 'all' && (e.type ?? 'other') !== errorType) return false;
        if (!q) return true;
        return [e.credit_number, e.customer_name, e.error, String(e.row_number)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      }),
    [errors, errorType, q]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (actionFilter !== 'all' && r.action !== actionFilter) return false;
        if (!q) return true;
        return [r.credit_number, r.customer_name, r.company_name, r.store_name, String(r.row_number)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      }),
    [rows, actionFilter, q]
  );

  const switchTab = (t: 'errors' | 'rows') => {
    setTab(t);
    setVisible(PAGE_SIZE);
  };

  const exportErrors = () =>
    downloadCsv(
      `greske_uvoz_kredita_${periodLabel?.replace('/', '_') ?? 'uvoz'}.csv`,
      ['Red', 'Broj kredita', 'Kupac', 'Vrsta', 'Datum u fajlu', 'Iznos u fajlu', 'Opis greške'],
      filteredErrors.map((e) => [
        e.row_number,
        e.credit_number,
        e.customer_name,
        ERROR_TYPES[e.type ?? 'other'].label,
        e.raw_date,
        e.raw_amount,
        e.error,
      ])
    );

  const exportRows = () =>
    downloadCsv(
      `uvezeni_krediti_${periodLabel?.replace('/', '_') ?? 'uvoz'}.csv`,
      ['Red', 'Broj kredita', 'Datum', 'Iznos', 'Prodavnica', 'Firma', 'Kupac', 'Status'],
      filteredRows.map((r) => [
        r.row_number,
        r.credit_number,
        formatDate(r.issue_date),
        r.amount != null ? String(r.amount).replace('.', ',') : '',
        r.store_name,
        r.company_name,
        r.customer_name,
        ACTION_LABELS[r.action].label,
      ])
    );

  const status =
    result.error_count === 0
      ? { icon: FiCheckCircle, text: 'Uvoz uspješno završen', className: 'from-emerald-500 to-teal-600' }
      : result.success_count === 0
      ? { icon: FiXCircle, text: 'Nijedan red nije uvezen', className: 'from-rose-500 to-red-600' }
      : { icon: FiAlertTriangle, text: 'Uvoz završen s greškama', className: 'from-amber-500 to-orange-600' };
  const StatusIcon = status.icon;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${status.className} p-4 text-white sm:p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <StatusIcon className="mt-0.5 h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">{status.text}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm opacity-90">
                {result.file_name && (
                  <span className="flex min-w-0 items-center gap-1">
                    <FiFileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{result.file_name}</span>
                  </span>
                )}
                {periodLabel && <span>Period: {periodLabel}</span>}
                {result.imported_at && <span>{new Date(result.imported_at).toLocaleString('bs-BA')}</span>}
                {result.overwrite && <span>Prepisivanje uključeno</span>}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Zatvori panel"
            className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/20"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs opacity-90">
            <span>Uspješno uvezeno {successRate}%</span>
            <span>
              {result.success_count} od {totalRows} redova
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${successRate}%` }} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-200 border-b border-gray-200 sm:grid-cols-5 sm:divide-y-0 dark:divide-dark-600 dark:border-dark-600">
        <SummaryCell label="Redova u fajlu" value={String(totalRows)} />
        <SummaryCell label="Novi krediti" value={String(createdCount)} accent="text-emerald-600 dark:text-emerald-400" />
        <SummaryCell label="Ažurirani" value={String(updatedCount)} accent="text-sky-600 dark:text-sky-400" />
        <SummaryCell
          label="Greške"
          value={String(result.error_count)}
          accent={result.error_count ? 'text-rose-600 dark:text-rose-400' : undefined}
        />
        <SummaryCell label="Ukupan iznos (BAM)" value={formatAmount(totalAmount)} className="col-span-2 sm:col-span-1" />
      </div>

      {(result.skipped_sheets ?? 0) > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 dark:border-dark-600 dark:bg-dark-700 dark:text-gray-400">
          Preskočeno listova bez prepoznatog zaglavlja: {result.skipped_sheets}
        </div>
      )}

      {/* Tabs + toolbar */}
      <div className="flex flex-col gap-3 border-b border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-dark-600">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-dark-700">
          <TabButton active={tab === 'errors'} onClick={() => switchTab('errors')}>
            <FiAlertTriangle className="h-4 w-4" />
            Greške
            <Badge tone={errors.length ? 'red' : 'gray'}>{result.error_count}</Badge>
          </TabButton>
          <TabButton active={tab === 'rows'} onClick={() => switchTab('rows')}>
            <FiCheckCircle className="h-4 w-4" />
            Uvezeni redovi
            <Badge tone="green">{result.success_count}</Badge>
          </TabButton>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              className="input pl-9"
              placeholder="Broj kredita, kupac, red…"
            />
          </div>
          <button
            type="button"
            onClick={tab === 'errors' ? exportErrors : exportRows}
            disabled={tab === 'errors' ? filteredErrors.length === 0 : filteredRows.length === 0}
            title="Preuzmi prikazane redove kao CSV (Excel)"
            className="btn-secondary flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            <FiDownload className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 px-3 py-2 dark:border-dark-600">
        {tab === 'errors' ? (
          <>
            <FilterChip active={errorType === 'all'} onClick={() => setErrorType('all')}>
              Sve ({errors.length})
            </FilterChip>
            {(Object.keys(ERROR_TYPES) as Array<keyof typeof ERROR_TYPES>)
              .filter((t) => errorTypeCounts[t])
              .map((t) => (
                <FilterChip key={t} active={errorType === t} onClick={() => setErrorType(t)}>
                  {ERROR_TYPES[t].label} ({errorTypeCounts[t]})
                </FilterChip>
              ))}
          </>
        ) : (
          <>
            <FilterChip active={actionFilter === 'all'} onClick={() => setActionFilter('all')}>
              Svi ({rows.length})
            </FilterChip>
            <FilterChip active={actionFilter === 'created'} onClick={() => setActionFilter('created')}>
              <FiPlusCircle className="h-3.5 w-3.5" /> Novi ({createdCount})
            </FilterChip>
            {updatedCount > 0 && (
              <FilterChip active={actionFilter === 'updated'} onClick={() => setActionFilter('updated')}>
                <FiRefreshCw className="h-3.5 w-3.5" /> Ažurirani ({rows.filter((r) => r.action === 'updated').length})
              </FilterChip>
            )}
            {rows.some((r) => r.action === 'updated_verified') && (
              <FilterChip active={actionFilter === 'updated_verified'} onClick={() => setActionFilter('updated_verified')}>
                Uparene zabrane ({rows.filter((r) => r.action === 'updated_verified').length})
              </FilterChip>
            )}
          </>
        )}
      </div>

      {/* Tables */}
      <div className="max-h-[32rem] overflow-auto">
        {tab === 'errors' ? (
          filteredErrors.length === 0 ? (
            <EmptyState text={errors.length === 0 ? 'Nema grešaka — svi redovi su uvezeni.' : 'Nema rezultata za zadani filter.'} />
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-dark-700 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2">Red</th>
                  <th className="px-3 py-2">Broj kredita</th>
                  <th className="px-3 py-2">Kupac</th>
                  <th className="px-3 py-2">Vrsta</th>
                  <th className="px-3 py-2">Datum / iznos u fajlu</th>
                  <th className="px-3 py-2">Opis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                {filteredErrors.slice(0, visible).map((e, i) => {
                  const t = ERROR_TYPES[e.type ?? 'other'];
                  return (
                    <tr key={`${e.row_number}-${i}`} className="align-top hover:bg-gray-50 dark:hover:bg-dark-700/60">
                      <td className="px-3 py-2 font-mono text-gray-500">{e.row_number}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{e.credit_number || '—'}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{e.customer_name || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${t.className}`}>
                          {t.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {e.raw_date != null || e.raw_amount != null ? (
                          <>
                            <div>Datum: <span className="font-mono">{e.raw_date ?? '—'}</span></div>
                            <div>Iznos: <span className="font-mono">{e.raw_amount ?? '—'}</span></div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{e.error}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : filteredRows.length === 0 ? (
          <EmptyState text={rows.length === 0 ? 'Nijedan red nije uvezen.' : 'Nema rezultata za zadani filter.'} />
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-dark-700 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2">Red</th>
                <th className="px-3 py-2">Broj kredita</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2 text-right">Iznos</th>
                <th className="px-3 py-2">Prodavnica</th>
                <th className="px-3 py-2">Kupac</th>
                <th className="px-3 py-2">Firma</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
              {filteredRows.slice(0, visible).map((r) => {
                const a = ACTION_LABELS[r.action];
                return (
                  <tr key={`${r.row_number}-${r.credit_number}`} className="hover:bg-gray-50 dark:hover:bg-dark-700/60">
                    <td className="px-3 py-2 font-mono text-gray-500">{r.row_number}</td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{r.credit_number}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300">{formatDate(r.issue_date)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-gray-900 dark:text-white">
                      {formatAmount(r.amount)}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.store_name || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.customer_name || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.company_name || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${a.className}`}>
                        {a.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {(() => {
        const total = tab === 'errors' ? filteredErrors.length : filteredRows.length;
        const truncated = tab === 'errors' ? result.errors_truncated : result.rows_truncated;
        if (total === 0 && !truncated) return null;
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-dark-600 dark:text-gray-400">
            <span>
              Prikazano {Math.min(visible, total)} od {total}
              {truncated && ' · server je vratio samo prvih 5000 redova'}
            </span>
            {visible < total && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Prikaži još {Math.min(PAGE_SIZE, total - visible)}
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  accent,
  className = '',
}: {
  label: string;
  value: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={`p-3 text-center sm:p-4 ${className}`}>
      <p className={`text-xl font-bold sm:text-2xl ${accent ?? 'text-gray-900 dark:text-white'}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition sm:flex-none ${
        active
          ? 'bg-white text-gray-900 shadow-sm dark:bg-dark-600 dark:text-white'
          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ tone, children }: { tone: 'red' | 'green' | 'gray'; children: React.ReactNode }) {
  const cls =
    tone === 'red'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
      : tone === 'green'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
      : 'bg-gray-200 text-gray-600 dark:bg-dark-500 dark:text-gray-300';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:text-gray-400'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">{text}</div>;
}
