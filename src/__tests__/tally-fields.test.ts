import {
  unwrapTallyValue,
  collectTallyFields,
  joinTallyArray,
  combinePlans,
  isExistingFamily,
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
  it('returns true for a "Sim" answer', () => {
    expect(isExistingFamily(['Sim, já participámos antes'])).toBe(true);
  });

  it('returns false for null', () => {
    expect(isExistingFamily(null)).toBe(false);
  });

  it('returns false for a "Não" answer', () => {
    expect(isExistingFamily(['Não'])).toBe(false);
  });
});
