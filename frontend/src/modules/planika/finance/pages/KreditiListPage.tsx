import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiSearch, FiDownload, FiRotateCcw, FiCheck, FiTrash2 } from 'react-icons/fi';
import { kreditiService } from '@/services/kreditiService';
import type { FinanceCredit } from '@/types/planika-finance';

const MONTHS = [
  'Svi', 'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

type FilterParams = {
  search?: string;
  year: number;
  month?: number;
  paired?: '0' | '1';
  date_from?: string;
  date_to?: string;
};

type SelectedMeta = {
  amount: number;
  isPaired: boolean;
};

function computeSelectionStats(meta: Map<number, SelectedMeta>, currency = 'BAM') {
  let pairedCount = 0;
  let unpairedCount = 0;
  let pairedAmount = 0;
  let unpairedAmount = 0;

  meta.forEach((m) => {
    if (m.isPaired) {
      pairedCount += 1;
      pairedAmount += m.amount;
    } else {
      unpairedCount += 1;
      unpairedAmount += m.amount;
    }
  });

  const amount = pairedAmount + unpairedAmount;

  return {
    count: meta.size,
    amount: Math.round(amount * 100) / 100,
    pairedCount,
    unpairedCount,
    pairedAmount: Math.round(pairedAmount * 100) / 100,
    unpairedAmount: Math.round(unpairedAmount * 100) / 100,
    currency,
  };
}

export default function KreditiListPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FinanceCredit[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0);
  const [paired, setPaired] = useState<'' | '0' | '1'>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [unpairingId, setUnpairingId] = useState<number | null>(null);

  const [selectedMeta, setSelectedMeta] = useState<Map<number, SelectedMeta>>(new Map());
  const [bulkRegistrar, setBulkRegistrar] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkUnpairing, setBulkUnpairing] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filterParams = useMemo<FilterParams>(() => ({
    search: search || undefined,
    year,
    month: month || undefined,
    paired: paired || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [search, year, month, paired, dateFrom, dateTo]);

  const clearSelection = useCallback(() => {
    setSelectedMeta(new Map());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await kreditiService.list({
        ...filterParams,
        page,
        per_page: 25,
      });
      setItems(res.data);
      setLastPage(res.last_page);
    } catch {
      toast.error('Greška pri učitavanju kredita');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    clearSelection();
  }, [search, year, month, paired, dateFrom, dateTo, clearSelection]);

  const selectionStats = useMemo(() => {
    const currency = items.find((c) => selectedMeta.has(c.id))?.currency ?? 'BAM';
    return computeSelectionStats(selectedMeta, currency);
  }, [selectedMeta, items]);

  const allPageSelected = items.length > 0 && items.every((c) => selectedMeta.has(c.id));

  const isSelected = useCallback((id: number) => selectedMeta.has(id), [selectedMeta]);

  const toggleCredit = (c: FinanceCredit) => {
    setSelectedMeta((prev) => {
      const next = new Map(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.set(c.id, { amount: Number(c.amount) || 0, isPaired: c.is_paired });
      return next;
    });
  };

  const togglePageAll = () => {
    if (allPageSelected) {
      setSelectedMeta((prev) => {
        const next = new Map(prev);
        items.forEach((c) => next.delete(c.id));
        return next;
      });
      return;
    }

    setSelectedMeta((prev) => {
      const next = new Map(prev);
      items.forEach((c) => next.set(c.id, { amount: Number(c.amount) || 0, isPaired: c.is_paired }));
      return next;
    });
  };

  const getIdsByPaired = (pairedFlag: boolean) =>
    [...selectedMeta.entries()]
      .filter(([, m]) => m.isPaired === pairedFlag)
      .map(([id]) => id);

  const handleBulkVerify = async () => {
    if (selectionStats.unpairedCount === 0) return;
    if (!bulkRegistrar.trim()) {
      toast.error('Broj registratora je obavezan');
      return;
    }
    if (!window.confirm(
      `Upisati ${selectionStats.unpairedCount} zabrana kao uparene?\nUkupan iznos: ${selectionStats.unpairedAmount.toLocaleString('bs-BA')} ${selectionStats.currency}`,
    )) {
      return;
    }

    setBulkSaving(true);
    try {
      const res = await kreditiService.bulkVerifyZabrana({
        credit_ids: getIdsByPaired(false),
        registrar_number: bulkRegistrar.trim(),
        notes: bulkNotes.trim() || undefined,
      });
      toast.success(
        `Upareno ${res.paired_count} zabrana — ukupno ${res.paired_amount.toLocaleString('bs-BA')} ${res.currency}`,
      );
      clearSelection();
      setBulkRegistrar('');
      setBulkNotes('');
      await load();
    } catch {
      toast.error('Greška pri grupnom uparivanju');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkUnpair = async () => {
    if (selectionStats.pairedCount === 0) return;
    if (!window.confirm(
      `Vratiti ${selectionStats.pairedCount} zabrana u neuparene?\nUkupan iznos: ${selectionStats.pairedAmount.toLocaleString('bs-BA')} ${selectionStats.currency}`,
    )) {
      return;
    }

    setBulkUnpairing(true);
    try {
      const res = await kreditiService.bulkUnpairZabrana({
        credit_ids: getIdsByPaired(true),
      });
      toast.success(
        `Vraćeno ${res.unpaired_count} zabrana u neuparene — ukupno ${res.unpaired_amount.toLocaleString('bs-BA')} ${res.currency}`,
      );
      clearSelection();
      await load();
    } catch {
      toast.error('Greška pri grupnom vraćanju u neuparene');
    } finally {
      setBulkUnpairing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectionStats.count === 0) return;
    if (!window.confirm(
      `Trajno obrisati ${selectionStats.count} odabranih kredita?\nUkupan iznos: ${selectionStats.amount.toLocaleString('bs-BA')} ${selectionStats.currency}\n\nOva radnja se ne može poništiti.`,
    )) {
      return;
    }

    setBulkDeleting(true);
    try {
      const res = await kreditiService.bulkDelete({
        credit_ids: [...selectedMeta.keys()],
      });
      toast.success(
        `Obrisano ${res.deleted_count} kredita — ukupno ${res.deleted_amount.toLocaleString('bs-BA')} ${res.currency}`,
      );
      clearSelection();
      await load();
    } catch {
      toast.error('Greška pri brisanju kredita');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await kreditiService.exportZabrane(filterParams);
      toast.success('Excel export preuzet — svi zapisi iz filtera');
    } catch {
      toast.error('Greška pri exportu zabrana');
    } finally {
      setExporting(false);
    }
  };

  const handleUnpair = async (c: FinanceCredit) => {
    if (!c.is_paired) return;
    if (!window.confirm(`Vratiti kredit ${c.credit_number} u neuparene?`)) return;

    setUnpairingId(c.id);
    try {
      await kreditiService.unpairZabrana(c.id);
      toast.success('Zabrana vraćena u neuparene');
      await load();
    } catch {
      toast.error('Greška pri vraćanju u neuparene');
    } finally {
      setUnpairingId(null);
    }
  };

  const formatMoney = (amount: number, currency: string) =>
    `${amount.toLocaleString('bs-BA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const busy = bulkSaving || bulkUnpairing || bulkDeleting;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Pretraga (broj, kupac, firma, prodavnica…)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="input" value={year} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="input" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{i === 0 ? m : m}</option>
            ))}
          </select>
          <select className="input" value={paired} onChange={(e) => { setPaired(e.target.value as '' | '0' | '1'); setPage(1); }}>
            <option value="">Svi statusi</option>
            <option value="1">Upareni</option>
            <option value="0">Neupareni</option>
          </select>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Datum od</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="label">Datum do</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
          </div>
          {(dateFrom || dateTo) && (
            <div className="flex items-end sm:col-span-2">
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              >
                Poništi datum filter
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <FiRefreshCw size={16} />
            Osvježi
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <FiDownload size={16} />
            {exporting ? 'Export…' : 'Export u Excel (svi iz filtera)'}
          </button>
        </div>
      </div>

      {selectionStats.count > 0 && (
        <div className="card border-primary-200 bg-primary-50/60 p-4 dark:border-primary-800 dark:bg-primary-900/20">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Selekcija zabrana</p>
              <p className="mt-1 text-2xl font-bold text-primary-700 dark:text-primary-300">
                {formatMoney(selectionStats.amount, selectionStats.currency)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ukupno odabrano: <strong>{selectionStats.count}</strong>
                {selectionStats.unpairedCount > 0 && (
                  <span> · neuparenih: <strong>{selectionStats.unpairedCount}</strong> ({formatMoney(selectionStats.unpairedAmount, selectionStats.currency)})</span>
                )}
                {selectionStats.pairedCount > 0 && (
                  <span> · uparenih: <strong>{selectionStats.pairedCount}</strong> ({formatMoney(selectionStats.pairedAmount, selectionStats.currency)})</span>
                )}
              </p>
            </div>

            {selectionStats.unpairedCount > 0 && (
              <div className="flex w-full flex-col gap-2 border-t border-primary-200/80 pt-3 dark:border-primary-800 sm:flex-row sm:items-center">
                <input
                  className="input flex-1"
                  placeholder="Broj registratora za uparivanje *"
                  value={bulkRegistrar}
                  onChange={(e) => setBulkRegistrar(e.target.value)}
                />
                <input
                  className="input flex-1"
                  placeholder="Napomena (opcionalno)"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary flex shrink-0 items-center justify-center gap-2 px-4"
                  disabled={busy || !bulkRegistrar.trim()}
                  onClick={handleBulkVerify}
                >
                  <FiCheck size={16} />
                  {bulkSaving ? 'Uparivanje…' : `Evidentiraj (${selectionStats.unpairedCount})`}
                </button>
              </div>
            )}

            {selectionStats.pairedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-primary-200/80 pt-3 dark:border-primary-800">
                <button
                  type="button"
                  className="btn-secondary flex items-center justify-center gap-2 px-4"
                  disabled={busy}
                  onClick={handleBulkUnpair}
                >
                  <FiRotateCcw size={16} />
                  {bulkUnpairing ? 'Vraćanje…' : `Vrati u neuparene (${selectionStats.pairedCount})`}
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-primary-200/80 pt-3 dark:border-primary-800">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900/50 dark:bg-dark-800 dark:text-red-400 dark:hover:bg-red-900/20"
                disabled={busy}
                onClick={handleBulkDelete}
              >
                <FiTrash2 size={16} />
                {bulkDeleting ? 'Brisanje…' : `Obriši (${selectionStats.count})`}
              </button>
              <button type="button" className="btn-secondary px-3 text-sm" onClick={clearSelection} disabled={busy}>
                Poništi selekciju
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-gray-500">Učitavanje…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nema kredita za odabrane filtere.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={allPageSelected}
                      disabled={items.length === 0}
                      onChange={togglePageAll}
                      title="Odaberi sve na stranici"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Broj kredita</th>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Kupac</th>
                  <th className="px-4 py-3 font-medium">Prodavnica</th>
                  <th className="px-4 py-3 font-medium">Iznos</th>
                  <th className="px-4 py-3 font-medium">Registrator</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Akcija</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-100 dark:border-dark-700 ${
                      isSelected(c.id) ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={isSelected(c.id)}
                        onChange={() => toggleCredit(c)}
                        title="Odaberi za grupnu akciju"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{c.credit_number}</td>
                    <td className="px-4 py-3">{c.issue_date ?? '—'}</td>
                    <td className="px-4 py-3">{c.customer_name ?? '—'}</td>
                    <td className="px-4 py-3">{c.store_name ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {c.amount != null ? `${Number(c.amount).toLocaleString('bs-BA')} ${c.currency}` : '—'}
                    </td>
                    <td className="px-4 py-3">{c.registrar_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.is_paired
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {c.is_paired ? 'Uparen' : 'Neuparen'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.is_paired ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/20"
                          disabled={unpairingId === c.id}
                          onClick={() => handleUnpair(c)}
                        >
                          <FiRotateCcw size={14} />
                          {unpairingId === c.id ? '…' : 'Vrati u neuparene'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lastPage > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-dark-600">
            <button
              type="button"
              disabled={page <= 1}
              className="btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prethodna
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Stranica {page} / {lastPage}
              {selectionStats.count > 0 && (
                <span className="ml-2 text-primary-600 dark:text-primary-400">
                  · odabrano {selectionStats.count}
                </span>
              )}
            </span>
            <button
              type="button"
              disabled={page >= lastPage}
              className="btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Sljedeća
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
