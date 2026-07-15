export const CREDIT_NUMBER_PATTERN = /^\d{2}-\d{4}-\d{2}-\d{5}$/;
export const CREDIT_NUMBER_LOOSE_PATTERN = /\d{2}[\s\-]?\d{4}[\s\-]?\d{2}[\s\-]?\d{5}/;

export function formatCreditNumberDigits(digits: string): string | null {
  if (digits.length !== 13) return null;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 13)}`;
}

export function normalizeCreditNumber(raw: string): string {
  const trimmed = raw.trim();
  const exact = trimmed.match(CREDIT_NUMBER_LOOSE_PATTERN);
  if (exact) {
    const digits = exact[0].replace(/[^\d]/g, '');
    const formatted = formatCreditNumberDigits(digits);
    if (formatted) return formatted;
  }

  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  const formatted = formatCreditNumberDigits(digitsOnly);
  return formatted ?? trimmed;
}

export function isValidCreditNumber(value: string): boolean {
  return CREDIT_NUMBER_PATTERN.test(value);
}

export function extractCreditNumber(text: string): string | null {
  const normalized = normalizeCreditNumber(text);
  if (isValidCreditNumber(normalized)) return normalized;

  const match = text.match(CREDIT_NUMBER_LOOSE_PATTERN);
  if (!match) return null;

  const fromMatch = normalizeCreditNumber(match[0]);
  return isValidCreditNumber(fromMatch) ? fromMatch : null;
}
