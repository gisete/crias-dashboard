import { parsePlan, parsePlanParts, computePerSessionValues } from '../plan-parser';

describe('parsePlan', () => {
  it('parses single session without photos', () => {
    const result = parsePlan('1 sessão (14€)');
    expect(result).toEqual({ unitPrice: 14, numSessions: 1, hasPhotos: false });
  });

  it('parses multiple sessions with photos', () => {
    const result = parsePlan('2 sessões + 6 registos fotográficos (40€)');
    expect(result).toEqual({ unitPrice: 40, numSessions: 2, hasPhotos: true });
  });

  it('parses monthly pack without photos', () => {
    const result = parsePlan('Pack mensal 4 sessões (50€)');
    expect(result).toEqual({ unitPrice: 50, numSessions: 4, hasPhotos: false });
  });

  it('parses monthly pack with photos', () => {
    const result = parsePlan('Pack mensal 8 sessões + 16 registos fotográficos (132€)');
    expect(result).toEqual({ unitPrice: 132, numSessions: 8, hasPhotos: true });
  });

  it('parses large monthly pack with photos', () => {
    const result = parsePlan('Pack mensal 16 sessões + 32 registos fotográficos (264€)');
    expect(result).toEqual({ unitPrice: 264, numSessions: 16, hasPhotos: true });
  });

  it('parses a combined individual + pack plan by summing price and sessions', () => {
    const result = parsePlan('1 sessão (14€) + Pack mensal 4 sessões (50€)');
    expect(result).toEqual({ unitPrice: 64, numSessions: 5, hasPhotos: false });
  });

  it('still parses a single session plan on its own', () => {
    const result = parsePlan('1 sessão (14€)');
    expect(result).toEqual({ unitPrice: 14, numSessions: 1, hasPhotos: false });
  });

  it('still parses a single pack plan on its own', () => {
    const result = parsePlan('Pack mensal 4 sessões (50€)');
    expect(result).toEqual({ unitPrice: 50, numSessions: 4, hasPhotos: false });
  });
});

describe('parsePlanParts', () => {
  it('returns single part for a simple plan', () => {
    expect(parsePlanParts('Pack mensal 4 sessões (50€)')).toEqual([
      { unitPrice: 50, numSessions: 4, hasPhotos: false, isPack: true },
    ]);
  });

  it('returns single part for individual with photos', () => {
    expect(parsePlanParts('2 sessões + 6 registos fotográficos (40€)')).toEqual([
      { unitPrice: 40, numSessions: 2, hasPhotos: true, isPack: false },
    ]);
  });

  it('splits a combined individual + pack plan into two parts', () => {
    expect(parsePlanParts('1 sessão (14€) + Pack mensal 4 sessões (50€)')).toEqual([
      { unitPrice: 14, numSessions: 1, hasPhotos: false, isPack: false },
      { unitPrice: 50, numSessions: 4, hasPhotos: false, isPack: true },
    ]);
  });

  it('handles combined plan where pack has photos', () => {
    expect(parsePlanParts('1 sessão (14€) + Pack mensal 4 sessões + 8 registos fotográficos (66€)')).toEqual([
      { unitPrice: 14, numSessions: 1, hasPhotos: false, isPack: false },
      { unitPrice: 66, numSessions: 4, hasPhotos: true, isPack: true },
    ]);
  });

  it('handles combined plan where individual has photos', () => {
    expect(parsePlanParts('2 sessões + 6 registos fotográficos (40€) + Pack mensal 4 sessões (50€)')).toEqual([
      { unitPrice: 40, numSessions: 2, hasPhotos: true, isPack: false },
      { unitPrice: 50, numSessions: 4, hasPhotos: false, isPack: true },
    ]);
  });
});

describe('computePerSessionValues', () => {
  it('returns uniform values for a single pack plan', () => {
    expect(computePerSessionValues('Pack mensal 4 sessões (50€)', 4))
      .toEqual([12.5, 12.5, 12.5, 12.5]);
  });

  it('returns uniform values for a single session plan', () => {
    expect(computePerSessionValues('1 sessão (14€)', 1))
      .toEqual([14]);
  });

  it('allocates per-part values for a combined plan', () => {
    expect(computePerSessionValues('1 sessão (14€) + Pack mensal 4 sessões (50€)', 5))
      .toEqual([14, 12.5, 12.5, 12.5, 12.5]);
  });

  it('handles combined plan with photos on individual part', () => {
    expect(computePerSessionValues('1 sessão + 3 registos fotográficos (20€) + Pack mensal 4 sessões (50€)', 5))
      .toEqual([20, 12.5, 12.5, 12.5, 12.5]);
  });

  it('fills extra dates with last part rate when dates exceed plan sessions', () => {
    expect(computePerSessionValues('Pack mensal 4 sessões (50€)', 6))
      .toEqual([12.5, 12.5, 12.5, 12.5, 12.5, 12.5]);
  });

  it('returns fewer values when plan has more sessions than dates', () => {
    expect(computePerSessionValues('Pack mensal 4 sessões (50€)', 2))
      .toEqual([12.5, 12.5]);
  });
});
