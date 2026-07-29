export const MONTH_NAMES: string[] = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const MONTH_LABELS: string[] = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MONTH_TO_NUMBER: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// "março" is the only month name with a diacritic, so a targeted swap
// covers accent-insensitive matching without a general Unicode stripper.
function stripAccents(value: string): string {
  return value.replace(/ç/g, 'c');
}

const UNACCENTED_MONTH_TO_NUMBER: Record<string, number> = Object.fromEntries(
  MONTH_NAMES.map((name, i) => [stripAccents(name), i + 1]),
);

/**
 * "julho" -> "Julho", "marco" -> "Março". Tally sends month names
 * lowercase and without accents (see /sobre convention), so lookup is
 * done on the accent-stripped form and the accented label is restored
 * from MONTH_LABELS. Falls back to a plain capitalized first letter for
 * unrecognized input instead of throwing, since callers use this for
 * display text, not validation.
 */
export function capitalizeMonth(month: string): string {
  const monthNumber = UNACCENTED_MONTH_TO_NUMBER[stripAccents(month.trim().toLowerCase())];
  if (monthNumber) return MONTH_LABELS[monthNumber - 1];
  return month.charAt(0).toUpperCase() + month.slice(1);
}
