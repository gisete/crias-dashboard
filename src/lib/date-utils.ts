/**
 * Strip any trailing text after the slot parenthesis, e.g.
 * "11 (manhã) 2 VAGAS" -> "11 (manhã)". Returns the input unchanged if it
 * doesn't match the expected "N (manhã|tarde)" pattern at all, so unexpected
 * formats pass through instead of being silently dropped.
 */
export function normalizeDateEntry(raw: string): string {
  const match = raw.match(/^\d+\s*\((manhã|tarde)\)/);
  return match ? match[0] : raw;
}

/**
 * Today's date as YYYY-MM-DD in the Europe/Lisbon timezone, for string
 * comparison against ISO session dates without Date-object DST pitfalls.
 */
export function getTodayLisbon(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const day = parts.find((p) => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}
