const STORAGE_KEY = 'crias:selectedMonth';

export interface StoredMonth {
  month: string;
  year: number;
}

export function saveSelectedMonth(month: string, year: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ month, year }));
  } catch {
    // localStorage unavailable (e.g. private browsing) — ignore
  }
}

export function readStoredMonth(): StoredMonth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.month === 'string' && typeof parsed?.year === 'number') {
      return { month: parsed.month, year: parsed.year };
    }
    return null;
  } catch {
    return null;
  }
}
