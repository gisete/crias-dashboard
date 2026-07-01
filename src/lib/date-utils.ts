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
