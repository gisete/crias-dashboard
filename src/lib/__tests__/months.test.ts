import { capitalizeMonth } from '../months';

describe('capitalizeMonth', () => {
  it('capitalizes a plain lowercase month', () => {
    expect(capitalizeMonth('julho')).toBe('Julho');
  });

  it('adds the accent for março when sent unaccented', () => {
    expect(capitalizeMonth('marco')).toBe('Março');
  });

  it('handles março already accented', () => {
    expect(capitalizeMonth('março')).toBe('Março');
  });

  it('is case-insensitive', () => {
    expect(capitalizeMonth('MARCO')).toBe('Março');
  });

  it('falls back to capitalizing the first letter for unrecognized input', () => {
    expect(capitalizeMonth('xyz')).toBe('Xyz');
  });
});
