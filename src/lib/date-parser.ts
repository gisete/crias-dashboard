/**
 * Parse a date-of-birth string into ISO YYYY-MM-DD.
 * Tally/Make sends DD/MM/YYYY; the DB column expects ISO format.
 */
export function parseDateOfBirth(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length !== 3) return null;

    const [dayStr, monthStr, yearStr] = parts;
    if (!/^\d{1,2}$/.test(dayStr) || !/^\d{1,2}$/.test(monthStr) || !/^\d{4}$/.test(yearStr)) {
      return null;
    }

    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return `${yearStr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}
