export type SessaoCheiaMode = 'none' | 'confirm' | 'choose';

/**
 * Which Sessão Cheia flow a registration gets: no dates (defensive — the
 * required-field gate normally blocks this), a single date to confirm, or
 * several dates to tick.
 */
export function getSessaoCheiaMode(selectedDates: string[]): SessaoCheiaMode {
  if (selectedDates.length === 0) return 'none';
  if (selectedDates.length === 1) return 'confirm';
  return 'choose';
}
