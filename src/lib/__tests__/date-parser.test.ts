import { parseDateOfBirth } from '../date-parser';

describe('parseDateOfBirth', () => {
  it('converts DD/MM/YYYY to ISO', () => {
    expect(parseDateOfBirth('19/03/2025')).toBe('2025-03-19');
  });

  it('converts another DD/MM/YYYY to ISO', () => {
    expect(parseDateOfBirth('01/12/2023')).toBe('2023-12-01');
  });

  it('passes through already-ISO dates unchanged', () => {
    expect(parseDateOfBirth('2025-03-19')).toBe('2025-03-19');
  });

  it('returns null for empty string', () => {
    expect(parseDateOfBirth('')).toBeNull();
  });

  it('returns null for unparseable value', () => {
    expect(parseDateOfBirth('invalid')).toBeNull();
  });

  it('returns null for invalid day/month', () => {
    expect(parseDateOfBirth('32/13/2025')).toBeNull();
  });
});
