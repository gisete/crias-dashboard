import { shortenPlan, getInitials } from '../plan-display';

describe('shortenPlan', () => {
  it('returns "1 sessão" for a single session plan', () => {
    expect(shortenPlan('1 sessão (14€)')).toBe('1 sessão');
  });

  it('returns sessions + foto for multi-session plan with photos', () => {
    expect(shortenPlan('2 sessões + 6 registos fotográficos (40€)')).toBe('2s + foto');
  });

  it('returns Pack Ns for monthly pack without photos', () => {
    expect(shortenPlan('Pack mensal 4 sessões (50€)')).toBe('Pack 4s');
  });

  it('returns Pack Ns + foto for monthly pack with photos', () => {
    expect(shortenPlan('Pack mensal 8 sessões + 16 registos fotográficos (132€)')).toBe('Pack 8s + foto');
  });
});

describe('getInitials', () => {
  it('returns first and last initials for a full name', () => {
    expect(getInitials('Ana Sofia Mendes')).toBe('AM');
  });

  it('returns single initial for a one-word name', () => {
    expect(getInitials('Carlos')).toBe('C');
  });

  it('handles extra whitespace', () => {
    expect(getInitials('  Maria  João  ')).toBe('MJ');
  });
});
