import { normalizeDateEntry, getTodayLisbon } from '../date-utils';

describe('normalizeDateEntry', () => {
  it('strips trailing text after the slot parenthesis', () => {
    expect(normalizeDateEntry('11 (manhã) 2 VAGAS')).toBe('11 (manhã)');
  });

  it('strips trailing text like ESGOTADO', () => {
    expect(normalizeDateEntry('11 (manhã) ESGOTADO')).toBe('11 (manhã)');
  });

  it('leaves an already-clean entry unchanged', () => {
    expect(normalizeDateEntry('11 (manhã)')).toBe('11 (manhã)');
  });

  it('strips trailing text for the tarde slot', () => {
    expect(normalizeDateEntry('20 (tarde) 3 VAGAS')).toBe('20 (tarde)');
  });

  it('returns unrecognized strings unchanged', () => {
    expect(normalizeDateEntry('invalid string')).toBe('invalid string');
  });
});

describe('getTodayLisbon', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(getTodayLisbon()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
