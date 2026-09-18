import { format, parseISO, isValid } from 'date-fns';

export type DateInput = string | Date | number | null | undefined;

/**
 * Parse API / browser date values safely (avoids UTC day-shift for YYYY-MM-DD).
 */
export function parseAppDate(value: DateInput): Date | null {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Date-only: interpret as local calendar day
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, day] = raw.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    return isValid(d) ? d : null;
  }

  // dd.mm.yyyy or dd.mm.yyyy HH:mm
  const dotted = raw.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dotted) {
    const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = dotted;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss)
    );
    return isValid(d) ? d : null;
  }

  let d = parseISO(raw);
  if (!isValid(d)) {
    d = new Date(raw);
  }
  return isValid(d) ? d : null;
}

/** Display date: dd.mm.yyyy */
export function formatDate(value: DateInput, fallback = '—'): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, 'dd.MM.yyyy');
}

/** Display date + time: dd.mm.yyyy HH:mm */
export function formatDateTime(value: DateInput, fallback = '—'): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, 'dd.MM.yyyy HH:mm');
}

/** Display date + seconds: dd.mm.yyyy HH:mm:ss */
export function formatDateTimeSeconds(value: DateInput, fallback = '—'): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, 'dd.MM.yyyy HH:mm:ss');
}

/** Month header: mm.yyyy */
export function formatMonthYear(value: DateInput, fallback = '—'): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, 'MM.yyyy');
}

/** API / <input type="date"> value: yyyy-MM-dd */
export function toApiDate(value: DateInput, fallback = ''): string {
  const d = parseAppDate(value);
  if (!d) return fallback;
  return format(d, 'yyyy-MM-dd');
}

/** Split datetime into display date (dd.MM.yyyy) and time (HH:mm). */
export function splitDateTimeParts(value: DateInput): { date: string; time: string } {
  const d = parseAppDate(value);
  if (!d) return { date: '', time: '' };
  return {
    date: format(d, 'dd.MM.yyyy'),
    time: format(d, 'HH:mm'),
  };
}

/**
 * Combine dd.MM.yyyy + HH:mm into API/local datetime string (yyyy-MM-dd'T'HH:mm).
 * Returns empty string when the date part is incomplete or invalid.
 */
export function combineDateTimeParts(dateStr: string, timeStr: string): string {
  const date = (dateStr || '').trim();
  let time = (timeStr || '').trim() || '00:00';
  if (!date) return '';

  // Normalize 9:00 → 09:00
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    time = `${String(Number(timeMatch[1])).padStart(2, '0')}:${timeMatch[2]}`;
  }

  const d = parseAppDate(`${date} ${time}`);
  if (!d) return '';
  return format(d, "yyyy-MM-dd'T'HH:mm");
}
