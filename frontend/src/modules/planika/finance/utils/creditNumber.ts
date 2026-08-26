export const CREDIT_NUMBER_PATTERN = /^\d{2}-\d{4}-\d{2}-\d{5}$/;
/** Dozvoljava razmake, crtice, tačke, kose crte koje OCR često ubaci. */
export const CREDIT_NUMBER_LOOSE_PATTERN =
  /\d{2}[\s\-–—./]?\d{4}[\s\-–—./]?\d{2}[\s\-–—./]?\d{5}/;

/** Godina u prefiksu broja kredita (yy), npr. 23…26, sljedeće 27. */
const CREDIT_YEAR_MIN = 20;
const CREDIT_YEAR_MAX = 39;

export function formatCreditNumberDigits(digits: string): string | null {
  if (digits.length !== 13) return null;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 13)}`;
}

/** Normalizuj crtice koje OCR često zamijeni. */
export function normalizeOcrSeparators(raw: string): string {
  return raw.replace(/[–—−]/g, '-');
}

/** Ispravke tipičnih OCR zamjena samo unutar kandidata za broj. */
export function sanitizeOcrDigitCandidate(raw: string): string {
  return normalizeOcrSeparators(raw)
    .replace(/[Oo]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8');
}

export function normalizeCreditNumber(raw: string): string {
  const trimmed = sanitizeOcrDigitCandidate(raw.trim());
  const exact = trimmed.match(CREDIT_NUMBER_LOOSE_PATTERN);
  if (exact) {
    const digits = exact[0].replace(/[^\d]/g, '');
    const formatted = formatCreditNumberDigits(digits);
    if (formatted && isValidCreditNumber(formatted)) return formatted;
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (digitsOnly.length === 13) {
    const formatted = formatCreditNumberDigits(digitsOnly);
    if (formatted && isValidCreditNumber(formatted)) return formatted;
  }

  return trimmed;
}

export function isValidCreditNumber(value: string): boolean {
  if (!CREDIT_NUMBER_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 2));
  // Filtrira JMBG (npr. 06-…) i slične 13-znamenkaste lažne pogodke
  return year >= CREDIT_YEAR_MIN && year <= CREDIT_YEAR_MAX;
}

export function extractCreditNumber(text: string): string | null {
  const all = extractAllCreditNumbers(text);
  return all[0] ?? null;
}

function tryAddFromChunk(found: Set<string>, chunk: string): void {
  const sanitized = sanitizeOcrDigitCandidate(chunk);
  const digits = sanitized.replace(/[^\d]/g, '');
  if (digits.length !== 13) return;
  const formatted = formatCreditNumberDigits(digits);
  if (formatted && isValidCreditNumber(formatted)) {
    found.add(formatted);
  }
}

/**
 * Svi jedinstveni brojevi kredita u tekstu (tabela može imati više redova).
 * Format: yy-xxxx-xx-xxxxx (yy = godina kredita, npr. 23…27).
 */
export function extractAllCreditNumbers(text: string): string[] {
  const found = new Set<string>();
  const cleaned = normalizeOcrSeparators(text);

  const re = new RegExp(CREDIT_NUMBER_LOOSE_PATTERN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned)) !== null) {
    tryAddFromChunk(found, match[0]);
  }

  // Kandidati s razmacima: 26- 3004- 13- 01654
  const spaced =
    cleaned.match(/\d{2}\s*[\-./]?\s*\d{4}\s*[\-./]?\s*\d{2}\s*[\-./]?\s*\d{5}/g) ?? [];
  for (const chunk of spaced) {
    tryAddFromChunk(found, chunk);
  }

  // Kontinuiranih 13 znamenki (OCR ponekad izgubi crtice) — samo ako yy izgleda kao godina
  const digitBlob = cleaned.replace(/[^\d]/g, ' ');
  const digitRuns = digitBlob.match(/\d{13}/g) ?? [];
  for (const run of digitRuns) {
    tryAddFromChunk(found, run);
  }

  // OCR ponekad ubaci slova umjesto znamenki unutar broja (O/I)
  const messy =
    cleaned.match(/[0-9OoIl|]{2}[\s\-./]?[0-9OoIl|]{4}[\s\-./]?[0-9OoIl|]{2}[\s\-./]?[0-9OoIl|]{5}/g) ??
    [];
  for (const chunk of messy) {
    tryAddFromChunk(found, chunk);
  }

  return Array.from(found);
}
