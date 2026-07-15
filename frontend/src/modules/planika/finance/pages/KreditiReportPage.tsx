import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import { kreditiService } from '@/services/kreditiService';
import type { KreditiReport } from '@/types/planika-finance';

const MONTHS = [
  'Svi', 'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

export default function KreditiReportPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState<KreditiReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kreditiService.report({
        year,
        month: month || undefined,
      });
      setReport(data);
    } catch {
      toast.error('Greška pri učitavanju izvještaja');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await kreditiService.exportZabrane({
        year,
        month: month || undefined,
      });
      toast.success('Excel export preuzet — svi zapisi iz filtera');
    } catch {
      toast.error('Greška pri exportu zabrana');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="label">Godina</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Mjesec</label>
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={load} className="btn-secondary flex items-center gap-2">
          <FiRefreshCw size={16} />
          Osvježi
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary flex items-center gap-2"
        >
          <FiDownload size={16} />
          {exporting ? 'Export…' : 'Export u Excel (svi iz filtera)'}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Učitavanje…</p>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <p className="text-xs uppercase text-gray-500">Ukupno kredita</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{report.total}</p>
            </div>
            <div className="card border-green-200 bg-green-50/50 p-5 dark:border-green-800 dark:bg-green-900/10">
              <p className="text-xs uppercase text-green-700 dark:text-green-400">Upareni</p>
              <p className="mt-2 text-3xl font-bold text-green-800 dark:text-green-300">{report.paired}</p>
            </div>
            <div className="card border-amber-200 bg-amber-50/50 p-5 dark:border-amber-800 dark:bg-amber-900/10">
              <p className="text-xs uppercase text-amber-700 dark:text-amber-400">Neupareni</p>
              <p className="mt-2 text-3xl font-bold text-amber-800 dark:text-amber-300">{report.unpaired}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs uppercase text-gray-500">Stopa uparivanja</p>
              <p className="mt-2 text-3xl font-bold text-primary-600 dark:text-primary-400">{report.paired_percent}%</p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <h3 className="border-b border-gray-200 px-4 py-3 font-semibold dark:border-dark-600">
              Pregled po mjesecima
            </h3>
            {report.by_month.length === 0 ? (
              <p className="p-6 text-center text-gray-500">Nema podataka.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-dark-800">
                    <tr>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3">Ukupno</th>
                      <th className="px-4 py-3">Upareni</th>
                      <th className="px-4 py-3">Neupareni</th>
                      <th className="px-4 py-3">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_month.map((row) => {
                      const pct = row.total > 0 ? Math.round((row.paired / row.total) * 1000) / 10 : 0;
                      return (
                        <tr key={`${row.year}-${row.month}`} className="border-t border-gray-100 dark:border-dark-700">
                          <td className="px-4 py-3 font-medium">
                            {MONTHS[row.month] ?? row.month} {row.year}
                          </td>
                          <td className="px-4 py-3">{row.total}</td>
                          <td className="px-4 py-3 text-green-700 dark:text-green-400">{row.paired}</td>
                          <td className="px-4 py-3 text-amber-700 dark:text-amber-400">{row.unpaired}</td>
                          <td className="px-4 py-3">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
