import { parsePlan } from '../plan-parser';

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
});
