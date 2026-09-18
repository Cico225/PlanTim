import { useRef } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { formatDate, toApiDate } from '@/utils/dateFormat';

type Props = {
  /** Display/storage value in dd.MM.yyyy */
  value: string;
  onChange: (ddMmYyyy: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
};

/**
 * Calendar date picker that shows dd.mm.yyyy in the UI.
 * A near-invisible native date input covers the field so the OS calendar opens on click.
 */
export default function AppDatePicker({
  value,
  onChange,
  required,
  className = '',
  id,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiValue = toApiDate(value) || '';

  const openCalendar = () => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    try {
      if (typeof el.showPicker === 'function') {
        void el.showPicker();
      }
    } catch {
      // Native click on the covering input still opens the picker in most browsers
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="input pointer-events-none flex w-full min-w-0 max-w-full items-center justify-between gap-2 text-left text-base">
        <span className={value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {value || 'dd.mm.yyyy'}
        </span>
        <FiCalendar className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
      </div>

      <input
        ref={inputRef}
        id={id}
        type="date"
        lang="hr-HR"
        value={apiValue}
        onChange={(e) => onChange(e.target.value ? formatDate(e.target.value) : '')}
        onClick={openCalendar}
        required={required}
        title="Izaberi datum"
        className="absolute inset-0 z-10 h-full w-full cursor-pointer"
        style={{ opacity: 0.01 }}
      />
    </div>
  );
}
