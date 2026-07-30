import {
  unwrapTallyValue,
  collectTallyFields,
  joinTallyArray,
  combinePlans,
  isExistingFamily,
  extractNumChildrenSelected,
} from '@/lib/tally-fields';

describe('unwrapTallyValue', () => {
  it('returns a plain string as-is', () => {
    expect(unwrapTallyValue('hello')).toBe('hello');
  });

  it('unwraps a single-element array', () => {
    expect(unwrapTallyValue(['val'])).toBe('val');
  });

  it('returns null for null', () => {
    expect(unwrapTallyValue(null)).toBeNull();
  });

  it('returns null for an array with an empty string', () => {
    expect(unwrapTallyValue([''])).toBeNull();
  });

  it('returns null for an empty array', () => {
    expect(unwrapTallyValue([])).toBeNull();
  });
});

describe('collectTallyFields', () => {
  it('collects non-null fields into a comma-separated string', () => {
    const fieldsById = { a: 'Maria', b: 'João' };
    expect(collectTallyFields(fieldsById, ['a', 'b'])).toBe('Maria, João');
  });

  it('skips nulls among the fields', () => {
    const fieldsById = { a: 'Maria', b: null };
    expect(collectTallyFields(fieldsById, ['a', 'b'])).toBe('Maria');
  });

  it('returns null if all fields are null', () => {
    const fieldsById = { a: null, b: null };
    expect(collectTallyFields(fieldsById, ['a', 'b'])).toBeNull();
  });
});

describe('joinTallyArray', () => {
  it('joins a multi-select array', () => {
    expect(joinTallyArray(['19 (tarde)', '20 (manhã)'])).toBe('19 (tarde), 20 (manhã)');
  });

  it('handles a single string value', () => {
    expect(joinTallyArray('19 (tarde)')).toBe('19 (tarde)');
  });

  it('returns null for an empty array', () => {
    expect(joinTallyArray([])).toBeNull();
  });

  it('trims whitespace from array values', () => {
    expect(joinTallyArray(['9 (manhã)                  '])).toBe('9 (manhã)');
  });

  it('trims whitespace from multiple array values', () => {
    expect(joinTallyArray(['9 (manhã)  ', '  16 (tarde)  '])).toBe('9 (manhã), 16 (tarde)');
  });

  it('trims whitespace from string value', () => {
    expect(joinTallyArray('  9 (manhã)  ')).toBe('9 (manhã)');
  });
});

describe('combinePlans', () => {
  it('returns the individual plan when only individual is filled', () => {
    expect(combinePlans(['1 sessão (14€)'], null)).toBe('1 sessão (14€)');
  });

  it('returns the pack plan when only pack is filled', () => {
    expect(combinePlans(null, ['Pack mensal 4 sessões (50€)'])).toBe('Pack mensal 4 sessões (50€)');
  });

  it('joins both plans with " + " when both are filled', () => {
    expect(combinePlans(['1 sessão (14€)'], ['Pack mensal 4 sessões (50€)'])).toBe(
      '1 sessão (14€) + Pack mensal 4 sessões (50€)'
    );
  });

  it('returns null when neither is filled', () => {
    expect(combinePlans(null, null)).toBeNull();
  });
});

describe('isExistingFamily', () => {
  // Array inputs (radio/dropdown from Tally)
  it('returns true for array starting with Sim', () => {
    expect(isExistingFamily(['Sim, já participámos antes'])).toBe(true);
  });

  it('returns false for array starting with Não', () => {
    expect(isExistingFamily(['Não, é a primeira vez'])).toBe(false);
  });

  it('returns false for array without Sim/Não prefix', () => {
    expect(isExistingFamily(['Já participámos antes (maio, junho ou julho)'])).toBe(false);
  });

  // Boolean inputs (checkbox-style)
  it('returns true for boolean true', () => {
    expect(isExistingFamily(true)).toBe(true);
  });

  it('returns false for boolean false', () => {
    expect(isExistingFamily(false)).toBe(false);
  });

  // String inputs
  it('returns true for string starting with Sim', () => {
    expect(isExistingFamily('Sim')).toBe(true);
  });

  it('returns false for string starting with Não', () => {
    expect(isExistingFamily('Não')).toBe(false);
  });

  // Edge cases
  it('returns false for null', () => {
    expect(isExistingFamily(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isExistingFamily(undefined)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isExistingFamily([])).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isExistingFamily(['SIM, somos família Crias'])).toBe(true);
  });
});

describe('extractNumChildrenSelected', () => {
  it('extracts number from array', () => {
    expect(extractNumChildrenSelected(['2'])).toBe(2);
  });

  it('extracts number from string', () => {
    expect(extractNumChildrenSelected('3')).toBe(3);
  });

  it('defaults to 1 for null', () => {
    expect(extractNumChildrenSelected(null)).toBe(1);
  });

  it('defaults to 1 for undefined', () => {
    expect(extractNumChildrenSelected(undefined)).toBe(1);
  });

  it('defaults to 1 for empty array', () => {
    expect(extractNumChildrenSelected([])).toBe(1);
  });

  it('defaults to 1 for non-numeric string', () => {
    expect(extractNumChildrenSelected(['abc'])).toBe(1);
  });

  it('defaults to 1 for zero', () => {
    expect(extractNumChildrenSelected(['0'])).toBe(1);
  });
});
