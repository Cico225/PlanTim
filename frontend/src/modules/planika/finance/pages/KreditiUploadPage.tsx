import { useState } from 'react';
import toast from 'react-hot-toast';
import { FiUpload } from 'react-icons/fi';
import { kreditiService } from '@/services/kreditiService';

const MONTHS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

export default function KreditiUploadPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const [overwrite, setOverwrite] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<Array<{ row_number: number; error: string }>>([]);

  const applyFilenamePeriod = (name: string) => {
    const base = name.replace(/\.[^.]+$/, '');
    const m = base.match(/^(\d{4})[_-](\d{1,2})$/);
    if (m) {
      setYear(Number(m[1]));
      setMonth(Number(m[2]));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Odaberite Excel fajl (.xlsx ili .xls)');
      return;
    }
    setUploading(true);
    setErrors([]);
    setProgress(0);
    try {
      const res = await kreditiService.upload(file, year, month, overwrite, setProgress);
      toast.success(`Uvezeno: ${res.success_count}, grešaka: ${res.error_count}${res.import_year ? ` (${res.import_month}/${res.import_year})` : ''}`);
      setErrors(res.errors ?? []);
      if (res.success_count > 0 && res.error_count === 0) {
        setFile(null);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string; error?: string } } }).response?.data?.error
          ?? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      toast.error(msg || 'Greška pri uvozu');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mjesečni uvoz kredita iz Excel-a</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Prilagođeno Planika exportu (npr. <strong>2026_05.xlsx</strong>). Zaglavlje u prvom redu:
          Broj dokumenta, Datum, WhsName, Naziv kupca/dobavljača (firma), Naziv kupca/dobavljača (kupac),
          Ukupno, PIO filijala, Status. Ako se fajl zove <code className="rounded bg-gray-100 px-1 dark:bg-dark-700">YYYY_MM</code>,
          godina i mjesec se automatski prepoznaju.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Godina uvoza</label>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mjesec uvoza</label>
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Excel fajl</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="input"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) applyFilenamePeriod(f.name);
            }}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
            className="rounded border-gray-300"
          />
          Prepiši postojeće kredite sa istim brojem (ne dira već uparene zabrane)
        </label>

        {uploading && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
              <div className="h-full bg-primary-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{progress}%</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="btn-primary mt-6 flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <FiUpload />
          {uploading ? 'Uvoz u toku…' : 'Uvezi kredite'}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="card max-h-64 overflow-y-auto p-4">
          <h3 className="font-medium text-red-700 dark:text-red-400">Greške pri uvozu ({errors.length})</h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {errors.map((e, i) => (
              <li key={i}>
                Red {e.row_number}: {e.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
