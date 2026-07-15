import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCheck, FiSearch, FiCamera, FiCameraOff, FiX, FiRotateCcw } from 'react-icons/fi';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { createWorker, type Worker } from 'tesseract.js';
import { kreditiService } from '@/services/kreditiService';
import type { FinanceCredit } from '@/types/planika-finance';
import {
  extractCreditNumber,
  isValidCreditNumber,
  normalizeCreditNumber,
} from '../utils/creditNumber';

const EXAMPLE_CREDIT_NUMBER = '26-4002-13-01357';

export default function KreditiScanPage() {
  const [manualNumber, setManualNumber] = useState('');
  const [credit, setCredit] = useState<FinanceCredit | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrarNumber, setRegistrarNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const registrarRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const ocrWorkerRef = useRef<Worker | null>(null);
  const scanLockRef = useRef(false);

  const stopCamera = useCallback(() => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    readerRef.current = null;
    void ocrWorkerRef.current?.terminate();
    ocrWorkerRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
    scanLockRef.current = false;
  }, []);

  const lookup = useCallback(async (number: string) => {
    const n = normalizeCreditNumber(number);
    if (!isValidCreditNumber(n)) {
      toast.error('Unesite ispravan broj kredita (npr. 26-4002-13-01357)');
      return;
    }
    setLoading(true);
    setCredit(null);
    try {
      const res = await kreditiService.lookup(n);
      if (res.found && res.credit) {
        stopCamera();
        setCredit(res.credit);
        setRegistrarNumber(res.credit.registrar_number ?? '');
        setNotes(res.credit.notes ?? '');
        setShowNotes(Boolean(res.credit.notes));
        if (res.credit.is_paired) {
          toast.success('Kredit pronađen — već uparen');
        } else {
          toast.success('Kredit pronađen');
        }
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      toast.error(msg || 'Kredit nije pronađen');
      setCredit(null);
    } finally {
      setLoading(false);
    }
  }, [stopCamera]);

  const handleScanResult = useCallback(async (raw: string) => {
    if (scanLockRef.current) return;
    const number = extractCreditNumber(raw);
    if (!number) return;

    scanLockRef.current = true;
    setManualNumber(number);
    await lookup(number);
    setTimeout(() => {
      scanLockRef.current = false;
    }, 2000);
  }, [lookup]);

  const startCamera = useCallback(() => {
    stopCamera();
    setScanning(true);
  }, [stopCamera]);

  const prepareNextScan = useCallback(() => {
    setCredit(null);
    setManualNumber('');
    setRegistrarNumber('');
    setNotes('');
    setShowNotes(false);
    scanLockRef.current = false;
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (!scanning) return;

    const video = videoRef.current;
    if (!video) return;

    let active = true;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(undefined, video, (result) => {
        if (!active || !result) return;
        void handleScanResult(result.getText());
      })
      .then((controls) => {
        if (!active) {
          controls.stop();
          return;
        }
        scannerControlsRef.current = controls;
      })
      .catch(() => {
        if (active) {
          toast.error('Nije moguće pristupiti kameri. Dozvolite pristup u Safari postavkama.');
          setScanning(false);
        }
      });

    return () => {
      active = false;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
      readerRef.current = null;
    };
  }, [scanning, handleScanResult]);

  useEffect(() => {
    if (!scanning) return;

    let active = true;
    let ocrBusy = false;
    let ocrTimer: ReturnType<typeof setInterval> | null = null;

    const startOcr = async () => {
      try {
        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789-',
        });
        if (!active) {
          await worker.terminate();
          return;
        }
        ocrWorkerRef.current = worker;

        ocrTimer = setInterval(() => {
          void (async () => {
            if (!active || ocrBusy || scanLockRef.current) return;
            const video = videoRef.current;
            if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
              return;
            }

            ocrBusy = true;
            try {
              const canvas = document.createElement('canvas');
              const maxWidth = 960;
              const scale = Math.min(1, maxWidth / video.videoWidth);
              const cropX = video.videoWidth * 0.08;
              const cropY = video.videoHeight * 0.2;
              const cropW = video.videoWidth * 0.84;
              const cropH = video.videoHeight * 0.55;
              canvas.width = Math.floor(cropW * scale);
              canvas.height = Math.floor(cropH * scale);

              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
              const { data: { text } } = await worker.recognize(canvas);
              const number = extractCreditNumber(text);
              if (number && active && !scanLockRef.current) {
                void handleScanResult(number);
              }
            } catch {
              /* ignore frame errors */
            } finally {
              ocrBusy = false;
            }
          })();
        }, 1600);
      } catch {
        if (active) {
          toast.error('Prepoznavanje broja kredita nije dostupno na ovom uređaju.');
        }
      }
    };

    void startOcr();

    return () => {
      active = false;
      if (ocrTimer) clearInterval(ocrTimer);
      void ocrWorkerRef.current?.terminate();
      ocrWorkerRef.current = null;
    };
  }, [scanning, handleScanResult]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (!credit) return;
    const t = window.setTimeout(() => registrarRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [credit]);

  const handleUnpair = async () => {
    if (!credit?.is_paired) return;
    if (!window.confirm('Vratiti ovu zabranu u status neupareno?')) return;

    setSaving(true);
    try {
      await kreditiService.unpairZabrana(credit.id);
      toast.success('Zabrana vraćena u neuparene');
      prepareNextScan();
    } catch {
      toast.error('Greška pri vraćanju u neuparene');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!credit) return;
    if (!registrarNumber.trim()) {
      toast.error('Broj registratora je obavezan');
      return;
    }
    setSaving(true);
    try {
      const res = await kreditiService.verifyZabrana(credit.id, {
        registrar_number: registrarNumber.trim(),
        notes: notes.trim() || undefined,
      });
      setCredit(res.credit);
      toast.success('Zabrana uparena — skenirajte sljedeći kredit');
      prepareNextScan();
    } catch {
      toast.error('Greška pri evidentiranju zabrane');
    } finally {
      setSaving(false);
    }
  };

  const resetForNext = () => {
    prepareNextScan();
  };

  const formatAmount = (amount: number | null, currency: string) =>
    amount != null ? `${Number(amount).toLocaleString('bs-BA')} ${currency}` : '—';

  if (credit) {
    return (
      <div className="mx-auto flex h-full max-w-lg flex-col sm:block sm:h-auto sm:space-y-4">
        <div className="card flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pb-56 sm:flex-none sm:overflow-visible sm:pb-4">
          <div className="flex items-start justify-between gap-2">
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                credit.is_paired
                  ? 'bg-green-100 text-green-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {credit.is_paired ? 'Uparen' : 'Neuparen'}
            </span>
            <button
              type="button"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700"
              onClick={resetForNext}
              aria-label="Sljedeći kredit"
            >
              <FiX size={20} />
            </button>
          </div>

          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Broj kredita</p>
          <p className="break-all font-mono text-2xl font-bold leading-tight text-gray-900 dark:text-white sm:text-3xl">
            {credit.credit_number}
          </p>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">Kupac</p>
          <p className="text-xl font-bold leading-snug text-gray-900 dark:text-white sm:text-2xl">
            {credit.customer_name ?? '—'}
          </p>

          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Firma</p>
          <p className="text-lg font-semibold leading-snug text-gray-800 dark:text-gray-200">
            {credit.company_name ?? '—'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Prodavnica</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{credit.store_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Iznos</p>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {formatAmount(credit.amount, credit.currency)}
              </p>
            </div>
          </div>

          {credit.issue_date && (
            <p className="mt-3 text-sm text-gray-500">
              Datum izdavanja: <span className="font-medium text-gray-700 dark:text-gray-300">{credit.issue_date}</span>
            </p>
          )}
        </div>

        <div className="card fixed inset-x-0 bottom-0 z-30 shrink-0 border-t border-gray-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] sm:static sm:z-auto sm:border-t-0 sm:bg-transparent sm:shadow-none dark:border-dark-600 dark:bg-dark-800 sm:dark:bg-transparent">
          <div className="mx-auto max-w-lg p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Broj registratora <span className="text-red-500">*</span>
          </label>
          <input
            ref={registrarRef}
            className="input py-2.5 text-base"
            value={registrarNumber}
            onChange={(e) => setRegistrarNumber(e.target.value)}
            placeholder="npr. 01/26"
            required
            enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && registrarNumber.trim() && handleVerify()}
          />

          {showNotes ? (
            <textarea
              className="input mt-2 min-h-[56px] text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Napomena (opcionalno)"
              rows={2}
            />
          ) : (
            <button
              type="button"
              className="mt-1 text-xs text-primary-600 dark:text-primary-400"
              onClick={() => setShowNotes(true)}
            >
              + Dodaj napomenu
            </button>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary flex flex-1 items-center justify-center gap-2 py-3 text-base touch-manipulation"
              disabled={saving || !registrarNumber.trim()}
              onClick={handleVerify}
            >
              <FiCheck size={20} />
              {credit.is_paired ? 'Ažuriraj' : 'Evidentiraj zabranu'}
            </button>
            {credit.is_paired && (
              <button
                type="button"
                className="btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm touch-manipulation"
                disabled={saving}
                onClick={handleUnpair}
              >
                <FiRotateCcw size={16} />
                Vrati u neuparene
              </button>
            )}
          </div>

          <button
            type="button"
            className="mt-2 w-full py-1 text-center text-xs text-gray-500 sm:hidden"
            onClick={resetForNext}
          >
            Sljedeći kredit
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-3 sm:p-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">Skeniranje kredita</h2>
        <p className="mt-1 hidden text-sm text-gray-600 dark:text-gray-400 sm:block">
          Skenirajte broj kredita sa ugovora ili zabrane (format{' '}
          <span className="font-mono">{EXAMPLE_CREDIT_NUMBER}</span>).
        </p>

        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1 py-2.5 font-mono text-base"
            placeholder={EXAMPLE_CREDIT_NUMBER}
            value={manualNumber}
            onChange={(e) => setManualNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup(manualNumber)}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="btn-primary shrink-0 px-4 touch-manipulation"
            disabled={loading}
            onClick={() => lookup(manualNumber)}
          >
            <FiSearch size={20} />
          </button>
        </div>

        <div className="mt-2">
          {!scanning ? (
            <button type="button" className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 touch-manipulation" onClick={startCamera}>
              <FiCamera />
              Uključi kameru
            </button>
          ) : (
            <button type="button" className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 touch-manipulation" onClick={stopCamera}>
              <FiCameraOff />
              Isključi kameru
            </button>
          )}
        </div>

        <div className={`relative mt-2 overflow-hidden rounded-xl bg-black ${scanning ? '' : 'hidden'}`}>
          <video
            ref={videoRef}
            className="aspect-video max-h-[34dvh] w-full object-cover sm:aspect-[4/3] sm:max-h-none"
            playsInline
            muted
            autoPlay
          />
          {scanning && (
            <>
              <div className="pointer-events-none absolute inset-4 rounded-lg border-2 border-dashed border-white/70 sm:inset-8" />
              <p className="pointer-events-none absolute bottom-1 left-0 right-0 px-2 text-center text-[10px] text-white/90 sm:text-xs">
                Usmjerite na broj kredita
              </p>
            </>
          )}
        </div>

        {loading && <p className="mt-2 text-center text-xs text-gray-500">Pretraga…</p>}
      </div>
    </div>
  );
}
