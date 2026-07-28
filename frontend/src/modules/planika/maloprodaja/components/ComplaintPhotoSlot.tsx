import { useRef, useState } from 'react';
import { FiCamera, FiCheck, FiImage } from 'react-icons/fi';

interface ComplaintPhotoSlotProps {
  label: string;
  slot: number;
  previewUrl?: string | null;
  uploaded?: boolean;
  disabled?: boolean;
  onSelect: (slot: number, file: File) => Promise<void>;
}

export default function ComplaintPhotoSlot({
  label,
  slot,
  previewUrl,
  uploaded = false,
  disabled = false,
  onSelect,
}: ComplaintPhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const displayUrl = localPreview || previewUrl;

  const handleFile = async (file?: File | null) => {
    if (!file || disabled || uploading) return;

    let objectUrl: string | null = null;

    try {
      setUploading(true);
      objectUrl = URL.createObjectURL(file);
      setLocalPreview(objectUrl);
      await onSelect(slot, file);
    } catch {
      setLocalPreview(null);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-dark-700 dark:bg-dark-800">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {uploaded && !uploading && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <FiCheck size={12} />
            Učitano
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-amber-400 hover:bg-amber-50/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-600 dark:bg-dark-900/40 dark:hover:border-amber-500/60"
      >
        {displayUrl ? (
          <>
            <img src={displayUrl} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800">
                Promijeni
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-gray-500 dark:text-gray-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-dark-700">
              {uploading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              ) : (
                <FiCamera size={22} className="text-amber-500" />
              )}
            </div>
            <span className="text-sm font-medium">Dodaj fotografiju</span>
            <span className="text-xs">Kamera ili galerija</span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {displayUrl && !disabled && (
        <button
          type="button"
          onClick={() => {
            setLocalPreview(null);
            inputRef.current?.click();
          }}
          className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiImage size={12} />
          Nova slika
        </button>
      )}

      {uploading && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Optimizacija i upload...</p>
      )}
    </div>
  );
}
