/**
 * Tally wraps select/checkbox/radio values in arrays.
 * Text inputs are plain strings. This unwraps both cases.
 */
export function unwrapTallyValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' && first.trim() !== '' ? first : null;
  }
  if (typeof value === 'string' && value.trim() !== '') return value;
  return null;
}

/**
 * Collect non-null values from multiple Tally fields into a
 * comma-separated string. Used for children names and DOBs
 * where each child has its own field ID.
 */
export function collectTallyFields(
  fieldsById: Record<string, unknown>,
  fieldIds: string[]
): string | null {
  const values = fieldIds
    .map((id) => unwrapTallyValue(fieldsById[id]))
    .filter((v): v is string => v !== null);
  return values.length > 0 ? values.join(', ') : null;
}

/**
 * Collect all values from a multi-select Tally field into a
 * comma-separated string. Used for datas_selecionadas where
 * one field can have multiple selections.
 */
export function joinTallyArray(value: unknown): string | null {
  if (Array.isArray(value)) {
    const strings = value.filter(
      (v): v is string => typeof v === 'string' && v.trim() !== ''
    );
    return strings.length > 0 ? strings.join(', ') : null;
  }
  if (typeof value === 'string' && value.trim() !== '') return value;
  return null;
}

/**
 * Combine two plan fields (individual + pack) with " + " separator.
 * Either or both can be filled.
 */
export function combinePlans(individual: unknown, pack: unknown): string | null {
  const a = unwrapTallyValue(individual);
  const b = unwrapTallyValue(pack);
  if (a && b) return `${a} + ${b}`;
  return a || b || null;
}

/**
 * Determine if submission is from an existing family.
 * Tally field value is ["Sim, já participámos antes"] or similar.
 */
export function isExistingFamily(value: unknown): boolean {
  const str = unwrapTallyValue(value);
  return str !== null && str.toLowerCase().includes('sim');
}
